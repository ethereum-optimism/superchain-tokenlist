import fs from 'fs';
import path from 'path';
import { createPublicClient, http, type Chain } from 'viem';
import { mainnet, sepolia, optimism, optimismSepolia, base, baseSepolia, arbitrum, arbitrumSepolia } from 'viem/chains';

// Registry chain entry structure (from Superchain Registry)
export interface RegistryChainEntry {
  name: string;
  identifier: string;
  chainId: number;
  rpc: string[];
  explorers: string[];
  superchainLevel: number;
  governedByOptimism: boolean;
  dataAvailabilityType: string;
  parent: {
    type: string;
    chain: string;
  };
  gasPayingToken?: string;
  faultProofs: {
    status: string;
  };
}

// Enhanced chain config that includes registry data
export interface ChainConfig extends Chain {
  // Custom properties specific to superchain
  layer: 1 | 2;
  testnet?: boolean;
  parentChainId?: number;
  // Registry-specific fields
  superchainLevel: number;
  governedByOptimism: boolean;
  dataAvailabilityType: string;
  gasPayingToken?: string;
  faultProofsStatus: string;
}

// Registry data cache
let registryCache: Map<number, ChainConfig> | null = null;

// L1 chains that need to be added manually (not in Superchain Registry)
const L1_CHAINS: ChainConfig[] = [
  {
    id: 1,
    name: 'Ethereum',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: { http: ['https://mainnet.infura.io/v3/'] },
      public: { http: ['https://mainnet.infura.io/v3/'] }
    },
    blockExplorers: {
      default: { name: 'Etherscan', url: 'https://etherscan.io' }
    },
    layer: 1,
    testnet: false,
    superchainLevel: 2, // L1 is highest level
    governedByOptimism: false,
    dataAvailabilityType: 'eth-da',
    faultProofsStatus: 'n/a',
  },
  {
    id: 11155111,
    name: 'Sepolia',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: { http: ['https://sepolia.infura.io/v3/'] },
      public: { http: ['https://sepolia.infura.io/v3/'] }
    },
    blockExplorers: {
      default: { name: 'Etherscan', url: 'https://sepolia.etherscan.io' }
    },
    layer: 1,
    testnet: true,
    superchainLevel: 2, // L1 is highest level
    governedByOptimism: false,
    dataAvailabilityType: 'eth-da',
    faultProofsStatus: 'n/a',
  }
];

// Load chains from Superchain Registry
export function loadChainsFromRegistry(): Map<number, ChainConfig> {
  if (registryCache) {
    return registryCache;
  }

  const registryPath = path.join(__dirname, '../external/superchain-registry/chainList.json');
  
  if (!fs.existsSync(registryPath)) {
    throw new Error(`Superchain Registry not found at ${registryPath}. Run 'git submodule update --init --recursive' to fetch it.`);
  }

  const registryData: RegistryChainEntry[] = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
  const chains = new Map<number, ChainConfig>();

  // Add L1 chains first
  for (const l1Chain of L1_CHAINS) {
    chains.set(l1Chain.id, l1Chain);
  }

  // Add L2 chains from registry
  for (const entry of registryData) {
    // Convert registry entry to ChainConfig
    const chainConfig: ChainConfig = {
      id: entry.chainId,
      name: entry.name,
      nativeCurrency: { 
        name: 'Ether', 
        symbol: 'ETH', 
        decimals: 18 
      },
      rpcUrls: {
        default: { http: entry.rpc.filter(url => url.length > 0) },
        public: { http: entry.rpc.filter(url => url.length > 0) }
      },
      blockExplorers: entry.explorers.length > 0 ? {
        default: { 
          name: 'Explorer', 
          url: entry.explorers[0] 
        }
      } : undefined,
      // Custom properties
      layer: entry.parent.type === 'L2' ? 2 : 1,
      testnet: entry.parent.chain !== 'mainnet',
      parentChainId: entry.parent.chain === 'mainnet' ? 1 : 
                     entry.parent.chain === 'sepolia' ? 11155111 : undefined,
      // Registry-specific fields
      superchainLevel: entry.superchainLevel,
      governedByOptimism: entry.governedByOptimism,
      dataAvailabilityType: entry.dataAvailabilityType,
      gasPayingToken: entry.gasPayingToken,
      faultProofsStatus: entry.faultProofs.status,
    };

    chains.set(entry.chainId, chainConfig);
  }

  registryCache = chains;
  return chains;
}

// Utility function to convert ChainConfig to viem Chain format
export function chainConfigToViemChain(config: ChainConfig): Chain {
  return {
    id: config.id,
    name: config.name,
    nativeCurrency: config.nativeCurrency,
    rpcUrls: config.rpcUrls,
    blockExplorers: config.blockExplorers
  };
}

// Utility functions for chain data access (now using registry)
export function getChainById(chainId: number): ChainConfig | undefined {
  const chains = loadChainsFromRegistry();
  return chains.get(chainId);
}

export function getAllChains(): ChainConfig[] {
  const chains = loadChainsFromRegistry();
  return Array.from(chains.values());
}

export function getMainnetChains(): ChainConfig[] {
  return getAllChains().filter(chain => !chain.testnet);
}

export function getTestnetChains(): ChainConfig[] {
  return getAllChains().filter(chain => chain.testnet);
}

export function getL1Chains(): ChainConfig[] {
  return getAllChains().filter(chain => chain.layer === 1);
}

export function getL2Chains(): ChainConfig[] {
  return getAllChains().filter(chain => chain.layer === 2);
}

export function getSupportedChainIds(): number[] {
  const chains = loadChainsFromRegistry();
  return Array.from(chains.keys());
}

// Additional utility functions for registry-specific data
export function getStandardChains(): ChainConfig[] {
  return getAllChains().filter(chain => chain.superchainLevel >= 1);
}

export function getChainsByLevel(level: number): ChainConfig[] {
  return getAllChains().filter(chain => chain.superchainLevel === level);
}

export function getGovernedChains(): ChainConfig[] {
  return getAllChains().filter(chain => chain.governedByOptimism);
}

// Clear cache function for testing or updates
export function clearRegistryCache(): void {
  registryCache = null;
}