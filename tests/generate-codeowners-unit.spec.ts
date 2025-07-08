import fs from "fs";
import path from "path";

describe("CODEOWNERS generation logic", () => {
  // Test the core logic without external script execution
  
  const CHAIN_TEAMS = {
    1: ["@OP-Labs/reviewers"],           // Ethereum Mainnet
    10: ["@OP-Labs/reviewers"],          // Optimism Mainnet
    8453: ["@base-org/reviewers"],       // Base Mainnet
    42161: ["@arbitrum/reviewers"],      // Arbitrum One
  };

  function getAllDeployments(token: any) {
    if (token.deployments) {
      return token.deployments;
    } else if (token.deployment) {
      return [token.deployment];
    } else {
      throw new Error("Token entry must have either 'deployment' or 'deployments' field");
    }
  }

  function getTeamsForChains(chainIds: number[]): string[] {
    const teams = new Set<string>();
    
    chainIds.forEach(chainId => {
      const chainTeams = CHAIN_TEAMS[chainId as keyof typeof CHAIN_TEAMS];
      if (chainTeams) {
        chainTeams.forEach(team => teams.add(team));
      } else {
        teams.add("@OP-Labs/reviewers");
      }
    });
    
    return Array.from(teams).sort();
  }

  it("should map single-chain token to correct team", () => {
    const singleChainToken = {
      token: { name: "OP Token", symbol: "OP" },
      deployment: { chainId: 10, address: "0x123", decimals: 18, type: "SuperchainERC20" }
    };

    const deployments = getAllDeployments(singleChainToken);
    const chainIds = deployments.map((d: any) => d.chainId);
    const teams = getTeamsForChains(chainIds);

    expect(teams).toEqual(["@OP-Labs/reviewers"]);
  });

  it("should map multi-chain token to multiple teams", () => {
    const multiChainToken = {
      token: { name: "USDC", symbol: "USDC" },
      deployments: [
        { chainId: 1, address: "0x123", decimals: 6, type: "NativeUSDC" },
        { chainId: 10, address: "0x456", decimals: 6, type: "OptimismMintableERC20" },
        { chainId: 8453, address: "0x789", decimals: 6, type: "NativeUSDC" }
      ]
    };

    const deployments = getAllDeployments(multiChainToken);
    const chainIds = deployments.map((d: any) => d.chainId);
    const teams = getTeamsForChains(chainIds);

    expect(teams).toEqual(["@OP-Labs/reviewers", "@base-org/reviewers"]);
  });

  it("should use fallback team for unsupported chains", () => {
    const unsupportedChainToken = {
      token: { name: "Mystery Token", symbol: "MYSTERY" },
      deployment: { chainId: 999999, address: "0x123", decimals: 18, type: "SuperchainERC20" }
    };

    const deployments = getAllDeployments(unsupportedChainToken);
    const chainIds = deployments.map((d: any) => d.chainId);
    const teams = getTeamsForChains(chainIds);

    expect(teams).toEqual(["@OP-Labs/reviewers"]);
  });

  it("should deduplicate teams for tokens on multiple chains from same team", () => {
    const multiOptimismToken = {
      token: { name: "Multi OP Token", symbol: "MULTIOP" },
      deployments: [
        { chainId: 1, address: "0x123", decimals: 18, type: "SuperchainERC20" },
        { chainId: 10, address: "0x456", decimals: 18, type: "SuperchainERC20" }
      ]
    };

    const deployments = getAllDeployments(multiOptimismToken);
    const chainIds = deployments.map((d: any) => d.chainId);
    const teams = getTeamsForChains(chainIds);

    // Both chains 1 and 10 map to @OP-Labs/reviewers, should not duplicate
    expect(teams).toEqual(["@OP-Labs/reviewers"]);
  });

  it("should handle error when no deployment info", () => {
    const invalidToken = {
      token: { name: "Invalid Token", symbol: "INVALID" }
      // Missing both deployment and deployments
    };

    expect(() => getAllDeployments(invalidToken)).toThrow(
      "Token entry must have either 'deployment' or 'deployments' field"
    );
  });
});