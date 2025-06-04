// tests/schema.spec.ts

import Ajv from "ajv";
import schema from "../schema/token.schema.json";

const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(schema);

describe("Token schema validation", () => {
  it("validates a minimal correct token entry", () => {
    const example = {
      version: "1.0.0",
      token: {
        assetId: "abc-123",
        name: "Example Token",
        symbol: "EXMPL",
        logoURI: "https://example.com/logo.svg",
        description: "An example token",
        website: "https://example.com",
        x: "https://twitter.com/example",
      },
      deployment: {
        chainId: 1,
        address: "0x0000000000000000000000000000000000000001",
        decimals: 18,
        type: "SuperchainERC20",
      },
      bridges: [
        {
          fromChainId: 1,
          toChainId: 10,
          standardBridge: true
        }
      ],
      coinGeckoId: "example-coin",
      docs: "https://example.com/docs",
      lastVerified: "2025-06-04T00:00:00Z"
    };
    const valid = validate(example);
    expect(valid).toBe(true);
    expect(validate.errors).toBeNull();
  });

  it("fails on invalid assetId (uppercase)", () => {
    const bad = {
      version: "1.0.0",
      token: {
        assetId: "ABC-123", // uppercase letter not allowed
        name: "Bad Token",
        symbol: "BAD",
        logoURI: "https://example.com/logo.svg",
        description: "Invalid assetId",
        website: "https://example.com",
        x: "https://example.com",
      },
      deployment: {
        chainId: 1,
        address: "0x0000000000000000000000000000000000000002",
        decimals: 18,
        type: "SuperchainERC20",
      },
      bridges: [
        {
          fromChainId: 1,
          toChainId: 10,
          standardBridge: true
        }
      ],
      coinGeckoId: "bad-coin",
      docs: "https://example.com/docs",
      lastVerified: "2025-06-04T00:00:00Z"
    };
    const valid = validate(bad);
    expect(valid).toBe(false);
    expect(validate.errors).toBeDefined();
    const errors = validate.errors!.map((e) => e.instancePath + " " + e.message);
    expect(errors.some((msg) => msg.includes("assetId"))).toBe(true);
  });
});
