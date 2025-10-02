import fs from "fs";
import path from "path";
import * as glob from "glob";
// import pLimit from "p-limit";
import dotenv from "dotenv";
import { createPublicClient, http, type PublicClient } from "viem";
import { mainnet, optimism, base } from "viem/chains";
import { getChainById, getSupportedChainIds, chainConfigToViemChain } from "../src/chains";
import { TokenListV3Entry } from "../schema/token";

dotenv.config();

//all the chains that use the standard bridge will have this address; also possible to have a bridge override with a custom bridge address
const STANDARD_BRIDGE_ADDRESS = "0x4200000000000000000000000000000000000010";

interface BridgeEntry {
  fromChainId: number;
  toChainId: number;
  standardBridge: boolean;
  customBridge?: string;
}

type TokenEntry = TokenListV3Entry;

function getClientForChain(chainId: number): PublicClient {
  const chainConfig = getChainById(chainId);
  if (!chainConfig) {
    throw new Error(`Unsupported chainId ${chainId} in check-bridges.ts`);
  }


  const supportedChainIds = getSupportedChainIds();
  if (!supportedChainIds.includes(chainId)) {
    throw new Error(`ChainId ${chainId} is not in the list of supported chain IDs`);
  }

  const viemChain = chainConfigToViemChain(chainConfig);
  const rpcUrl = process.env.RPC_URL || chainConfig.rpcUrls.default.http[0];
  return createPublicClient({ 
    chain: viemChain, 
    transport: http(rpcUrl) 
  }) as PublicClient;
}

function getAllDeployments(entry: TokenEntry): Array<{ chainId: number; address: string; decimals: number; type: string }> {
  if (entry.deployments) {
    return entry.deployments;
  } else if (entry.deployment) {
    return [entry.deployment];
  } else {
    throw new Error("Token entry must have either 'deployment' or 'deployments' field");
  }
}

async function checkSingle(filePath: string) {
  const raw = fs.readFileSync(filePath, "utf-8");
  const entry: TokenEntry = JSON.parse(raw) as any;
  const deployments = getAllDeployments(entry);
  
  // Validate that bridge endpoints reference valid deployments
  const deploymentChains = new Set(deployments.map(d => d.chainId));
  
  if (!entry.bridges) {
    throw new Error(`No bridges defined in ${filePath}`);
  }
  
  for (const bridge of entry.bridges) {
    // Verify that bridge endpoints correspond to actual deployments
    if (!deploymentChains.has(bridge.fromChainId) && !deploymentChains.has(bridge.toChainId)) {
      throw new Error(
        `Bridge from chain ${bridge.fromChainId} to ${bridge.toChainId} references chains not in deployments for ${filePath}`
      );
    }
    const { fromChainId, toChainId, standardBridge, customBridge } = bridge;
    if (standardBridge) {
      const client = getClientForChain(toChainId);
      const code = await client.getCode({ address: STANDARD_BRIDGE_ADDRESS });
      if (!code || code.length <= 2) {
        throw new Error(
          `Standard bridge predeploy missing at ${ STANDARD_BRIDGE_ADDRESS } on chain ${toChainId} for file ${filePath}`
        );
      }
    } else {
      if (!customBridge) {
        throw new Error(`customBridge field missing for custom bridge entry in ${filePath}`);
      }
      const client = getClientForChain(toChainId);
      const code = await client.getCode({ address: customBridge as `0x${string}` });
      if (!code || code.length <= 2) {
        throw new Error(
          `Custom bridge contract missing at ${customBridge} on chain ${toChainId} for file ${filePath}`
        );
      }
    }
  }
  console.log(`✔ Bridge checks passed for ${filePath}`);
}

// Simple concurrency limiter function to replace p-limit
async function processWithLimit<T>(items: T[], limit: number, processor: (item: T) => Promise<void>): Promise<void> {
  const results: Promise<void>[] = [];
  let index = 0;

  const processNext = async (): Promise<void> => {
    const currentIndex = index++;
    if (currentIndex >= items.length) return;
    
    await processor(items[currentIndex]);
    return processNext();
  };

  // Start the initial batch of workers
  for (let i = 0; i < Math.min(limit, items.length); i++) {
    results.push(processNext());
  }

  await Promise.all(results);
}

export async function validateBridges(tokenFilesPattern?: string): Promise<void> {
  const pattern = tokenFilesPattern || path.join(__dirname, "../tokens/**/*.json");
  const allFiles = glob.sync(pattern);
  await processWithLimit(allFiles, 5, checkSingle);
}

async function main() {
  try {
    await validateBridges();
    console.log("✔ All bridge checks passed.");
    process.exit(0);
  } catch (e: any) {
    console.error("✖ Bridge validation failed:", e.message);
    process.exit(1);
  }
}

// Only run main if this file is executed directly
if (require.main === module) {
  main();
} 