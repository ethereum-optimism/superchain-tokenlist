import fs from "fs";
import path from "path";
import glob from "glob";
import pLimit from "p-limit";
import dotenv from "dotenv";
import { createPublicClient, http, type PublicClient } from "viem";
import { mainnet, optimism, base, arbitrum } from "viem/chains";

dotenv.config();

interface BridgeEntry {
  fromChainId: number;
  toChainId: number;
  standardBridge: boolean;
  customBridge?: string;
}

interface TokenEntry {
  deployment?: { chainId: number; address: string; decimals: number; type: string };
  deployments?: Array<{ chainId: number; address: string; decimals: number; type: string }>;
  bridges: BridgeEntry[];
}

function getClientForChain(chainId: number): PublicClient {
  switch (chainId) {
    case 1:
      return createPublicClient({ chain: mainnet, transport: http(process.env.MAINNET_RPC || "") }) as PublicClient;
    case 10:
      return createPublicClient({ chain: optimism, transport: http(process.env.OPTIMISM_RPC || "") }) as PublicClient;
    case 8453:
      return createPublicClient({ chain: base, transport: http(process.env.BASE_MAINNET_RPC || "") }) as PublicClient;
    case 42161:
      return createPublicClient({ chain: arbitrum, transport: http(process.env.ARBITRUM_RPC || "") }) as PublicClient;
    default:
      throw new Error(`Unsupported chainId ${chainId} in check-bridges.ts`);
  }
}

// Placeholder: compute standard bridge predeploy address for an Optimism-style chain.
// You must replace this stub with the actual hashing logic per OP-Stack spec.
function computeStandardBridgePredeploy(fromChain: number, toChain: number): `0x${string}` {
  // TODO: Implement the real address derivation for standard L1<->L2 bridge predeploys.
  // For now, throw or return a dummy.
  throw new Error(
    `computeStandardBridgePredeploy not implemented for fromChain=${fromChain}, toChain=${toChain}`
  );
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
  
  for (const bridge of entry.bridges) {
    // Verify that bridge endpoints correspond to actual deployments
    if (!deploymentChains.has(bridge.fromChainId) && !deploymentChains.has(bridge.toChainId)) {
      throw new Error(
        `Bridge from chain ${bridge.fromChainId} to ${bridge.toChainId} references chains not in deployments for ${filePath}`
      );
    }
    const { fromChainId, toChainId, standardBridge, customBridge } = bridge;
    if (standardBridge) {
      const predeploy = computeStandardBridgePredeploy(fromChainId, toChainId);
      const client = getClientForChain(toChainId);
      const code = await client.getCode({ address: predeploy });
      if (!code || code.length <= 2) {
        throw new Error(
          `Standard bridge predeploy missing at ${predeploy} on chain ${toChainId} for file ${filePath}`
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
  }
  console.log(`✔ Bridge checks passed for ${filePath}`);
}

async function main() {
  const allFiles = glob.sync(path.join(__dirname, "../tokens/**/*.json"));
  const limit = pLimit(5);
  const tasks = allFiles.map((fp) => limit(() => checkSingle(fp)));
  try {
    await Promise.all(tasks);
    console.log("✔ All bridge checks passed.");
    process.exit(0);
  } catch (e: any) {
    console.error("✖ Bridge validation failed:", e.message);
    process.exit(1);
  }
}

main(); 