import { createPublicClient, http, type Chain } from 'viem';
import { mainnet, sepolia, optimism, optimismSepolia, base, baseSepolia, arbitrum, arbitrumSepolia } from 'viem/chains';

// Original format for backward compatibility and easier maintenance
export interface ChainConfig {
  id: number;
  name: string;
  layer: 1 | 2;
  rpcUrl: string;
  explorerUrl: string;
  testnet?: boolean;
  parentChainId?: number;
}

// Utility function to convert ChainConfig to viem Chain format
export function chainConfigToViemChain(config: ChainConfig): Chain {
  return {
    id: config.id,
    name: config.name,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: { http: [config.rpcUrl] },
      public: { http: [config.rpcUrl] }
    },
    blockExplorers: {
      default: { name: 'Explorer', url: config.explorerUrl }
    }
  };
}

export interface ChainData {
  [chainId: number]: ChainConfig;
}

// Static chain configuration - will be replaced by superchain registry API
export const CHAIN_DATA: ChainData = {
  // L1 Chains
  1: {
    id: 1,
    name: 'Ethereum',
    layer: 1,
    rpcUrl: 'https://mainnet.infura.io/v3/',
    explorerUrl: 'https://etherscan.io'
  },
  11155111: {
    id: 11155111,
    name: 'Sepolia',
    layer: 1,
    rpcUrl: 'https://sepolia.infura.io/v3/',
    explorerUrl: 'https://sepolia.etherscan.io',
    testnet: true
  },

  // L2 Chains - Optimism
  10: {
    id: 10,
    name: 'Optimism',
    layer: 2,
    rpcUrl: 'https://mainnet.optimism.io',
    explorerUrl: 'https://optimistic.etherscan.io',
    parentChainId: 1
  },
  11155420: {
    id: 11155420,
    name: 'Optimism Sepolia',
    layer: 2,
    rpcUrl: 'https://sepolia.optimism.io',
    explorerUrl: 'https://sepolia-optimism.etherscan.io',
    testnet: true,
    parentChainId: 11155111
  },

  // L2 Chains - Base
  8453: {
    id: 8453,
    name: 'Base',
    layer: 2,
    rpcUrl: 'https://mainnet.base.org',
    explorerUrl: 'https://basescan.org',
    parentChainId: 1
  },
  84532: {
    id: 84532,
    name: 'Base Sepolia',
    layer: 2,
    rpcUrl: 'https://sepolia.base.org',
    explorerUrl: 'https://sepolia.basescan.org',
    testnet: true,
    parentChainId: 11155111
  },

  // L2 Chains - Additional Superchain
  34443: {
    id: 34443,
    name: 'Mode',
    layer: 2,
    rpcUrl: 'https://mainnet.mode.network',
    explorerUrl: 'https://explorer.mode.network',
    parentChainId: 1
  },
  1135: {
    id: 1135,
    name: 'Lisk',
    layer: 2,
    rpcUrl: 'https://rpc.api.lisk.com',
    explorerUrl: 'https://blockscout.lisk.com',
    parentChainId: 1
  },
  4202: {
    id: 4202,
    name: 'Lisk Sepolia',
    layer: 2,
    rpcUrl: 'https://rpc.sepolia-api.lisk.com',
    explorerUrl: 'https://sepolia-blockscout.lisk.com',
    testnet: true,
    parentChainId: 11155111
  },
  690: {
    id: 690,
    name: 'Redstone',
    layer: 2,
    rpcUrl: 'https://rpc.redstonechain.com',
    explorerUrl: 'https://explorer.redstone.xyz',
    parentChainId: 1
  },
  1750: {
    id: 1750,
    name: 'Metal L2',
    layer: 2,
    rpcUrl: 'https://rpc.metall2.com',
    explorerUrl: 'https://explorer.metall2.com',
    parentChainId: 1
  },
  1740: {
    id: 1740,
    name: 'Metal L2 Sepolia',
    layer: 2,
    rpcUrl: 'https://testnet.rpc.metall2.com',
    explorerUrl: 'https://testnet.explorer.metall2.com',
    testnet: true,
    parentChainId: 11155111
  },
  1301: {
    id: 1301,
    name: 'Unichain',
    layer: 2,
    rpcUrl: 'https://rpc.unichain.org',
    explorerUrl: 'https://explorer.unichain.org',
    parentChainId: 1
  },
  1328: {
    id: 1328,
    name: 'Unichain Sepolia',
    layer: 2,
    rpcUrl: 'https://sepolia.rpc.unichain.org',
    explorerUrl: 'https://sepolia.explorer.unichain.org',
    testnet: true,
    parentChainId: 11155111
  },
  1946: {
    id: 1946,
    name: 'Soneium',
    layer: 2,
    rpcUrl: 'https://rpc.soneium.org',
    explorerUrl: 'https://explorer.soneium.org',
    parentChainId: 1
  },
  1947: {
    id: 1947,
    name: 'Soneium Minato',
    layer: 2,
    rpcUrl: 'https://rpc.minato.soneium.org',
    explorerUrl: 'https://explorer.minato.soneium.org',
    testnet: true,
    parentChainId: 11155111
  },
  42220: {
    id: 42220,
    name: 'Celo',
    layer: 2,
    rpcUrl: 'https://rpc.celo.org',
    explorerUrl: 'https://explorer.celo.org',
    parentChainId: 1
  },
  1923: {
    id: 1923,
    name: 'Swellchain',
    layer: 2,
    rpcUrl: 'https://rpc.swellchain.org',
    explorerUrl: 'https://explorer.swellchain.org',
    parentChainId: 1
  },
  57073: {
    id: 57073,
    name: 'Ink',
    layer: 2,
    rpcUrl: 'https://rpc.ink.org',
    explorerUrl: 'https://explorer.ink.org',
    parentChainId: 1
  },
  763373: {
    id: 763373,
    name: 'Ink Sepolia',
    layer: 2,
    rpcUrl: 'https://rpc.sepolia.ink.org',
    explorerUrl: 'https://explorer.sepolia.ink.org',
    testnet: true,
    parentChainId: 11155111
  },
  480: {
    id: 480,
    name: 'Worldchain',
    layer: 2,
    rpcUrl: 'https://rpc.worldchain.org',
    explorerUrl: 'https://explorer.worldchain.org',
    parentChainId: 1
  },
  4801: {
    id: 4801,
    name: 'Worldchain Sepolia',
    layer: 2,
    rpcUrl: 'https://rpc.sepolia.worldchain.org',
    explorerUrl: 'https://explorer.sepolia.worldchain.org',
    testnet: true,
    parentChainId: 11155111
  }
};

// Utility functions for chain data access
export function getChainById(chainId: number): ChainConfig | undefined {
  return CHAIN_DATA[chainId];
}

export function getAllChains(): ChainConfig[] {
  return Object.values(CHAIN_DATA);
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
  return Object.keys(CHAIN_DATA).map(Number);
}

// Future: Replace with superchain registry API
export async function fetchChainsFromRegistry(): Promise<ChainData> {
  // TODO: Implement superchain registry API integration
  // For now, return static data
  return CHAIN_DATA;
}