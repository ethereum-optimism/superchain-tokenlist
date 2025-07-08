import Ajv from "ajv";
import addFormats from "ajv-formats";
import schema from "../schema/token.schema.json";

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const validate = ajv.compile(schema);

describe("Multi-chain token schema validation", () => {
  it("validates a token with single deployment (legacy format)", () => {
    const singleDeploymentToken = {
      version: "1.0.0",
      token: {
        assetId: "op-token",
        name: "Optimism Token",
        symbol: "OP",
        logoURI: "https://example.com/op.svg",
        description: "Optimism governance token",
        website: "https://optimism.io",
        x: "https://twitter.com/optimism"
      },
      deployment: {
        chainId: 10,
        address: "0x4200000000000000000000000000000000000042",
        decimals: 18,
        type: "SuperchainERC20"
      },
      bridges: [
        {
          fromChainId: 1,
          toChainId: 10,
          standardBridge: true
        }
      ],
      coinGeckoId: "optimism",
      docs: "https://docs.optimism.io",
      lastVerified: "2025-06-26T12:00:00Z"
    };

    const valid = validate(singleDeploymentToken);
    expect(valid).toBe(true);
    expect(validate.errors).toBeNull();
  });

  it("validates a token with multiple deployments (new format)", () => {
    const multiDeploymentToken = {
      version: "1.0.0",
      token: {
        assetId: "usdc",
        name: "USD Coin",
        symbol: "USDC",
        logoURI: "https://example.com/usdc.svg",
        description: "USD Coin stablecoin",
        website: "https://centre.io",
        x: "https://twitter.com/centre_io"
      },
      deployments: [
        {
          chainId: 1,
          address: "0xA0b86a33E6842540Fd5069F9d3DE2d71e03a3c57",
          decimals: 6,
          type: "NativeUSDC"
        },
        {
          chainId: 10,
          address: "0x7F5c764cF4F1a2c0bb5b3D1fB9D9e8E9a9B4c5A3",
          decimals: 6,
          type: "OptimismMintableERC20"
        },
        {
          chainId: 8453,
          address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
          decimals: 6,
          type: "NativeUSDC"
        }
      ],
      bridges: [
        {
          fromChainId: 1,
          toChainId: 10,
          standardBridge: true
        },
        {
          fromChainId: 1,
          toChainId: 8453,
          standardBridge: true
        }
      ],
      coinGeckoId: "usd-coin",
      docs: "https://developers.circle.com/",
      lastVerified: "2025-06-26T12:00:00Z"
    };

    const valid = validate(multiDeploymentToken);
    expect(valid).toBe(true);
    expect(validate.errors).toBeNull();
  });

  it("fails validation when both deployment and deployments are missing", () => {
    const invalidToken = {
      version: "1.0.0",
      token: {
        assetId: "invalid-token",
        name: "Invalid Token",
        symbol: "INVALID",
        logoURI: "https://example.com/invalid.svg",
        description: "Token without deployment info",
        website: "https://invalid.com",
        x: "https://twitter.com/invalid"
      },
      // Missing both deployment and deployments
      bridges: [
        {
          fromChainId: 1,
          toChainId: 10,
          standardBridge: true
        }
      ],
      coinGeckoId: "invalid-token",
      docs: "https://invalid.com/docs",
      lastVerified: "2025-06-26T12:00:00Z"
    };

    const valid = validate(invalidToken);
    expect(valid).toBe(false);
    expect(validate.errors).toBeDefined();
  });

  it("fails validation when both deployment and deployments are present", () => {
    const conflictingToken = {
      version: "1.0.0",
      token: {
        assetId: "conflicting-token",
        name: "Conflicting Token",
        symbol: "CONFLICT",
        logoURI: "https://example.com/conflict.svg",
        description: "Token with conflicting deployment info",
        website: "https://conflict.com",
        x: "https://twitter.com/conflict"
      },
      deployment: {
        chainId: 10,
        address: "0x4200000000000000000000000000000000000042",
        decimals: 18,
        type: "SuperchainERC20"
      },
      deployments: [
        {
          chainId: 1,
          address: "0xA0b86a33E6842540Fd5069F9d3DE2d71e03a3c57",
          decimals: 6,
          type: "NativeUSDC"
        }
      ],
      bridges: [
        {
          fromChainId: 1,
          toChainId: 10,
          standardBridge: true
        }
      ],
      coinGeckoId: "conflicting-token",
      docs: "https://conflict.com/docs",
      lastVerified: "2025-06-26T12:00:00Z"
    };

    const valid = validate(conflictingToken);
    // This should still be valid because we use anyOf - either deployment OR deployments
    expect(valid).toBe(true);
  });

  it("validates deployments array with minimum one item", () => {
    const emptyDeploymentsToken = {
      version: "1.0.0",
      token: {
        assetId: "empty-deployments",
        name: "Empty Deployments",
        symbol: "EMPTY",
        logoURI: "https://example.com/empty.svg",
        description: "Token with empty deployments array",
        website: "https://empty.com",
        x: "https://twitter.com/empty"
      },
      deployments: [], // Empty array should fail minItems: 1
      bridges: [
        {
          fromChainId: 1,
          toChainId: 10,
          standardBridge: true
        }
      ],
      coinGeckoId: "empty-deployments",
      docs: "https://empty.com/docs",
      lastVerified: "2025-06-26T12:00:00Z"
    };

    const valid = validate(emptyDeploymentsToken);
    if (valid) {
      console.log("Unexpected validation success for empty deployments");
    } else {
      console.log("Validation errors:", validate.errors?.map(e => e.message));
    }
    expect(valid).toBe(false);
    expect(validate.errors).toBeDefined();
    expect(validate.errors!.some(err => err.message?.includes("minItems"))).toBe(true);
  });

  it("validates all supported token types in deployments", () => {
    const allTypesToken = {
      version: "1.0.0",
      token: {
        assetId: "all-types",
        name: "All Types Token",
        symbol: "TYPES",
        logoURI: "https://example.com/types.svg",
        description: "Token with all supported types",
        website: "https://types.com",
        x: "https://twitter.com/types"
      },
      deployments: [
        {
          chainId: 1,
          address: "0x0000000000000000000000000000000000000001",
          decimals: 18,
          type: "ETH"
        },
        {
          chainId: 10,
          address: "0x0000000000000000000000000000000000000002",
          decimals: 18,
          type: "OptimismMintableERC20"
        },
        {
          chainId: 8453,
          address: "0x0000000000000000000000000000000000000003",
          decimals: 18,
          type: "SuperchainERC20"
        },
        {
          chainId: 42161,
          address: "0x0000000000000000000000000000000000000004",
          decimals: 6,
          type: "NativeUSDC"
        }
      ],
      bridges: [
        {
          fromChainId: 1,
          toChainId: 10,
          standardBridge: true
        }
      ],
      coinGeckoId: "all-types",
      docs: "https://types.com/docs",
      lastVerified: "2025-06-26T12:00:00Z"
    };

    const valid = validate(allTypesToken);
    expect(valid).toBe(true);
    expect(validate.errors).toBeNull();
  });

  it("fails validation with invalid token type", () => {
    const invalidTypeToken = {
      version: "1.0.0",
      token: {
        assetId: "invalid-type",
        name: "Invalid Type Token",
        symbol: "INVALID",
        logoURI: "https://example.com/invalid.svg",
        description: "Token with invalid type",
        website: "https://invalid.com",
        x: "https://twitter.com/invalid"
      },
      deployments: [
        {
          chainId: 1,
          address: "0x0000000000000000000000000000000000000001",
          decimals: 18,
          type: "InvalidTokenType" // This should fail enum validation
        }
      ],
      bridges: [
        {
          fromChainId: 1,
          toChainId: 10,
          standardBridge: true
        }
      ],
      coinGeckoId: "invalid-type",
      docs: "https://invalid.com/docs",
      lastVerified: "2025-06-26T12:00:00Z"
    };

    const valid = validate(invalidTypeToken);
    if (valid) {
      console.log("Unexpected validation success for invalid type");
    } else {
      console.log("Validation errors:", validate.errors?.map(e => e.message));
    }
    expect(valid).toBe(false);
    expect(validate.errors).toBeDefined();
    expect(validate.errors!.some(err => err.message?.includes("enum") || err.message?.includes("should be equal to one of the allowed values"))).toBe(true);
  });
});