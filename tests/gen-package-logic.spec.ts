describe("Package generation logic for multi-chain tokens", () => {
  // Test the core expansion logic without file I/O

  function expandMultiChainTokens(tokens: any[]): any[] {
    const expandedTokens: any[] = [];
    
    tokens.forEach(token => {
      if (token.deployments && token.deployments.length > 0) {
        // Multi-chain token: create separate entries for each deployment
        token.deployments.forEach((deployment: any) => {
          expandedTokens.push({
            ...token,
            deployment,
            // Remove deployments array from individual entries
            deployments: undefined
          });
        });
      } else {
        // Single deployment token: keep as-is
        expandedTokens.push(token);
      }
    });
    
    return expandedTokens;
  }

  it("should expand multi-chain token into separate entries", () => {
    const multiChainToken = {
      version: "1.0.0",
      token: {
        assetId: "usdc",
        name: "USD Coin",
        symbol: "USDC"
      },
      deployments: [
        { chainId: 1, address: "0x123", decimals: 6, type: "NativeUSDC" },
        { chainId: 10, address: "0x456", decimals: 6, type: "OptimismMintableERC20" },
        { chainId: 8453, address: "0x789", decimals: 6, type: "NativeUSDC" }
      ],
      bridges: [],
      coinGeckoId: "usd-coin"
    };

    const expanded = expandMultiChainTokens([multiChainToken]);

    expect(expanded).toHaveLength(3);
    
    // Each expanded token should have single deployment
    expanded.forEach(token => {
      expect(token.deployment).toBeDefined();
      expect(token.deployments).toBeUndefined();
      expect(token.token.symbol).toBe("USDC");
    });

    // Check specific chain IDs
    const chainIds = expanded.map(t => t.deployment.chainId).sort();
    expect(chainIds).toEqual([1, 10, 8453]);
  });

  it("should preserve single-deployment tokens unchanged", () => {
    const singleChainToken = {
      version: "1.0.0",
      token: {
        assetId: "op-token",
        name: "Optimism Token",
        symbol: "OP"
      },
      deployment: {
        chainId: 10,
        address: "0x123",
        decimals: 18,
        type: "SuperchainERC20"
      },
      bridges: [],
      coinGeckoId: "optimism"
    };

    const expanded = expandMultiChainTokens([singleChainToken]);

    expect(expanded).toHaveLength(1);
    expect(expanded[0]).toEqual(singleChainToken);
  });

  it("should handle mix of single and multi-chain tokens", () => {
    const singleChainToken = {
      token: { symbol: "OP" },
      deployment: { chainId: 10, address: "0x123" }
    };

    const multiChainToken = {
      token: { symbol: "USDC" },
      deployments: [
        { chainId: 1, address: "0x456" },
        { chainId: 8453, address: "0x789" }
      ]
    };

    const expanded = expandMultiChainTokens([singleChainToken, multiChainToken]);

    expect(expanded).toHaveLength(3);
    
    const opTokens = expanded.filter(t => t.token.symbol === "OP");
    const usdcTokens = expanded.filter(t => t.token.symbol === "USDC");
    
    expect(opTokens).toHaveLength(1);
    expect(usdcTokens).toHaveLength(2);
    expect(opTokens[0].deployment.chainId).toBe(10);
    expect(usdcTokens.map(t => t.deployment.chainId).sort()).toEqual([1, 8453]);
  });

  it("should handle empty deployments array", () => {
    const emptyDeploymentsToken = {
      token: { symbol: "EMPTY" },
      deployments: []
    };

    const expanded = expandMultiChainTokens([emptyDeploymentsToken]);
    // Token with empty deployments array should be kept as-is (fallback behavior)
    expect(expanded).toHaveLength(1);
    expect(expanded[0]).toEqual(emptyDeploymentsToken);
  });

  it("should generate metadata correctly", () => {
    const tokens = [
      {
        token: { symbol: "OP" },
        deployment: { chainId: 10 }
      },
      {
        token: { symbol: "USDC" },
        deployments: [
          { chainId: 1 },
          { chainId: 8453 }
        ]
      }
    ];

    const expanded = expandMultiChainTokens(tokens);
    const chains = Array.from(new Set(expanded.map(t => t.deployment?.chainId).filter(Boolean))).sort();

    expect(chains).toEqual([1, 10, 8453]);
    expect(expanded.length).toBe(3); // 1 OP + 2 USDC
  });
});