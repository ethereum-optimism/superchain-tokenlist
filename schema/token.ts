/* eslint-disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */

export type TokenListV3Entry = {
  [k: string]: unknown;
} & {
  version?: string;
  token?: {
    assetId: string;
    name: string;
    symbol: string;
    logoURI: string;
    description: string;
    website: string;
    x: string;
    [k: string]: unknown;
  };
  deployment?: {
    chainId: number;
    address: string;
    decimals: number;
    type: "OptimismMintableERC20" | "SuperchainERC20" | "ETH" | "NativeUSDC";
    [k: string]: unknown;
  };
  /**
   * @minItems 1
   */
  deployments?: [
    {
      chainId: number;
      address: string;
      decimals: number;
      type: "OptimismMintableERC20" | "SuperchainERC20" | "ETH" | "NativeUSDC";
      [k: string]: unknown;
    },
    ...{
      chainId: number;
      address: string;
      decimals: number;
      type: "OptimismMintableERC20" | "SuperchainERC20" | "ETH" | "NativeUSDC";
      [k: string]: unknown;
    }[]
  ];
  /**
   * @minItems 1
   */
  bridges?: [
    {
      fromChainId: number;
      toChainId: number;
      standardBridge: boolean;
      customBridge?: string;
      [k: string]: unknown;
    },
    ...{
      fromChainId: number;
      toChainId: number;
      standardBridge: boolean;
      customBridge?: string;
      [k: string]: unknown;
    }[]
  ];
  coinGeckoId?: string;
  docs?: string;
  lastVerified?: string;
  [k: string]: unknown;
};
