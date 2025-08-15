import fs from "fs";
import path from "path";
import * as glob from "glob";
// import pLimit from "p-limit";
import dotenv from "dotenv";
import axios from "axios";
import { createPublicClient, http, type PublicClient } from "viem";
import { getChainById, getSupportedChainIds, chainConfigToViemChain } from "../src/chains";
import { TokenListV3Entry } from "../schema/token";

// Standard ERC-20 ABI fragments needed for name, symbol, decimals:
const ERC20_ABI = [
  { name: "name", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { name: "symbol", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { name: "decimals", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
];

dotenv.config();

type TokenEntry = TokenListV3Entry;

// @TODO: Pull this functionality out into a utility file
function getClientForChain(chainId: number): PublicClient {
  const chainConfig = getChainById(chainId);
  if (!chainConfig) {
    throw new Error(`Unsupported chainId ${chainId} in check-onchain.ts`);
  }

  const supportedChainIds = getSupportedChainIds();
  if (!supportedChainIds.includes(chainId)) {
    throw new Error(`ChainId ${chainId} is not in the list of supported chain IDs`);
  }

  const viemChain = chainConfigToViemChain(chainConfig);
  return createPublicClient({ 
    chain: viemChain, 
    transport: http(process.env.RPC_URL || chainConfig.rpcUrl) 
  }) as PublicClient;
}

function getAllDeployments(entry: TokenEntry): Array<{ chainId: number; address: string; decimals: number; type: string }> {
  if (entry.deployments) {
    return entry.deployments;
  } else if (entry.deployment) {
    return [entry.deployment as any];
  } else {
    throw new Error("Token entry must have either 'deployment' or 'deployments' field");
  }
}

async function checkSingleDeployment(
  deployment: { chainId: number; address: string; decimals: number },
  tokenInfo: { name: string; symbol: string },
  entryPath: string
) {
  const { chainId, address, decimals } = deployment;
  const { name: jsonName, symbol: jsonSymbol } = tokenInfo;

  const client = getClientForChain(chainId);
  // 1. Check if bytecode exists
  const bytecode = await client.getCode({ address: address as `0x${string}` });
  if (!bytecode || bytecode.length <= 2) {
    throw new Error(`No contract code found at ${address} on chain ${chainId}`);
  }
  // 2. Read name, symbol, decimals
  const [onchainName, onchainSymbol, onchainDecimals] = await Promise.all([
    client.readContract({ address: address as `0x${string}`, abi: ERC20_ABI, functionName: "name", args: [] }),
    client.readContract({ address: address as `0x${string}`, abi: ERC20_ABI, functionName: "symbol", args: [] }),
    client.readContract({ address: address as `0x${string}`, abi: ERC20_ABI, functionName: "decimals", args: [] }),
  ]);
  if (onchainName !== jsonName) {
    throw new Error(`Name mismatch at ${address}@${chainId}: JSON="${jsonName}", Onchain="${onchainName}"`);
  }
  if (onchainSymbol !== jsonSymbol) {
    throw new Error(`Symbol mismatch at ${address}@${chainId}: JSON="${jsonSymbol}", Onchain="${onchainSymbol}"`);
  }
  if (onchainDecimals !== decimals) {
    throw new Error(`Decimals mismatch at ${address}@${chainId}: JSON=${decimals}, Onchain=${onchainDecimals}`);
  }
  // 3. Check verified on Etherscan/Blockscout
  // Map chainId → Explorer API base & API key
  // @TODO: Use Superchain Registry for this
  // @TODO: Use blockscout endpoints
  let apiUrl: string;
  let apiKey: string | undefined;
  if (chainId === 1) {
    apiUrl = "https://api.etherscan.io/api";
    apiKey = process.env.ETHERSCAN_KEY;
  } else if (chainId === 10) {
    apiUrl = "https://api-optimistic.etherscan.io/api";
    apiKey = process.env.OPTIMISM_ETHERSCAN_KEY;
  } else if (chainId === 8453) {
    apiUrl = "https://api-goerli.basescan.org/api"; // adjust if needed
    apiKey = process.env.BASE_ETHERSCAN_KEY;
  } else {
    throw new Error(`No explorer configured for chainId ${chainId}`);
  }
  const params = {
    module: "contract",
    action: "getsourcecode",
    address,
    apikey: apiKey,
  };
  const resp = await axios.get(apiUrl, { params });
  const result = resp.data?.result;
  if (!Array.isArray(result) || result.length === 0) {
    throw new Error(`Unexpected response from Etherscan API for ${address}@${chainId}`);
  }
  const sourceCode = result[0].SourceCode;
  if (!sourceCode || sourceCode === "") {
    throw new Error(`Contract at ${address}@${chainId} is not verified on explorer`);
  }

  console.log(`✔ ${entryPath} @${chainId} is onchain-valid and verified.`);
}

async function checkSingle(entryPath: string) {
  const raw = fs.readFileSync(entryPath, "utf-8");
  const entry: TokenEntry = JSON.parse(raw) as any;
  const deployments = getAllDeployments(entry);
  if (!entry.token) {
    throw new Error(`No token definition in ${entryPath}`);
  }
  const { name: jsonName, symbol: jsonSymbol } = entry.token;

  // Check all deployments for this token
  for (const deployment of deployments) {
    await checkSingleDeployment(deployment, { name: jsonName, symbol: jsonSymbol }, entryPath);
  }
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

export async function validateOnchain(tokenFilesPattern?: string): Promise<void> {
  const pattern = tokenFilesPattern || path.join(__dirname, "../tokens/**/*.json");
  const allFiles = glob.sync(pattern);
  await processWithLimit(allFiles, 5, checkSingle);
}

async function main() {
  try {
    await validateOnchain();
    console.log("✔ All onchain checks passed.");
    process.exit(0);
  } catch (e: any) {
    console.error("✖ Onchain validation failed:", e.message);
    process.exit(1);
  }
}

// Only run main if this file is executed directly
if (require.main === module) {
  main();
} 