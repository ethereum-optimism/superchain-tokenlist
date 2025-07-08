import fs from "fs";
import path from "path";
import glob from "glob";
import pLimit from "p-limit";
import dotenv from "dotenv";
import axios from "axios";
import { createPublicClient, http, type PublicClient } from "viem";
import { mainnet, optimism, base, arbitrum } from "viem/chains";

// Standard ERC-20 ABI fragments needed for name, symbol, decimals:
const ERC20_ABI = [
  { name: "name", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { name: "symbol", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { name: "decimals", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
];

dotenv.config();

interface TokenEntry {
  token: {
    name: string;
    symbol: string;
    // ...
  };
  deployment?: {
    chainId: number;
    address: string;
    decimals: number;
    // ...
  };
  deployments?: Array<{
    chainId: number;
    address: string;
    decimals: number;
    type: string;
  }>;
  // ...
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
      throw new Error(`Unsupported chainId ${chainId} in check-onchain.ts`);
  }
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
  const { name: jsonName, symbol: jsonSymbol } = entry.token;

  // Check all deployments for this token
  for (const deployment of deployments) {
    await checkSingleDeployment(deployment, { name: jsonName, symbol: jsonSymbol }, entryPath);
  }
}

async function main() {
  const allFiles = glob.sync(path.join(__dirname, "../tokens/**/*.json"));
  const limit = pLimit(5);
  const tasks = allFiles.map((filePath) => limit(() => checkSingle(filePath)));
  try {
    await Promise.all(tasks);
    console.log("✔ All onchain checks passed.");
    process.exit(0);
  } catch (e: any) {
    console.error("✖ Onchain validation failed:", e.message);
    process.exit(1);
  }
}

main(); 