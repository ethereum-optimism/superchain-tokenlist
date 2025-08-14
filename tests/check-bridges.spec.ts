// tests/check-bridges.spec.ts

import fs from "fs";
import path from "path";
import nock from "nock";
import { validateBridges } from "../scripts/check-bridges";
import { createPublicClient, http, type PublicClient } from "viem";
import { base } from "viem/chains";

// Create a temporary JSON with a bridge entry
// @TODO: Replace with real bridge entries
const tempBridgeJson = path.join(__dirname, "../tokens/temp-bridge.json");
const bridgeEntry = {
  version: "1.0.0",
  token: {
    assetId: "bridge-123",
    name: "BridgeToken",
    symbol: "BRDGE",
    logoURI: "https://example.com/logo.svg",
    description: "Testing bridge",
    website: "https://example.com",
    x: "https://example.com",
  },
  deployment: {
    chainId: 8453,
    address: "0x0000000000000000000000000000000000000004",
    decimals: 18,
    type: "SuperchainERC20",
  },
  bridges: [
    {
      fromChainId: 8453,
      toChainId: 1,
      standardBridge: false,
      customBridge: "0x0000000000000000000000000000000000000005"
    }
  ],
  coinGeckoId: "bridge-coin",
  docs: "https://example.com/docs",
  lastVerified: "2025-06-04T00:00:00Z"
};
fs.writeFileSync(tempBridgeJson, JSON.stringify(bridgeEntry, null, 2));

describe("check-bridges script", () => {
  beforeAll(() => {
    // Nothing to spin up locally; we intercept via nock
  });
  afterAll(() => {
    fs.unlinkSync(tempBridgeJson);
    nock.cleanAll();
  });

  it("passes when customBridge bytecode exists", async () => {
    // Set environment variables for the test
    process.env.MAINNET_RPC = "http://localhost:8545";
    process.env.RPC_URL = "http://localhost:8545";
    
    // Stub getBytecode for customBridge on L1 (chainId=1)
    nock("http://localhost:8545")
      .post("/")
      .reply(200, (_uri, reqBody: any) => {
        const body = typeof reqBody === 'string' ? JSON.parse(reqBody) : reqBody;
        if (body.method === "eth_getCode" && body.params[0].toLowerCase() === "0x0000000000000000000000000000000000000005") {
          return { jsonrpc: "2.0", id: body.id, result: "0x6001600155" };
        }
        return { jsonrpc: "2.0", id: body.id, result: "0x" };
      });

    await expect(validateBridges(path.join(__dirname, "../tokens/temp-bridge.json"))).resolves.not.toThrow();
  });

  it("fails when customBridge is missing code", async () => {
    // Set environment variables for the test
    process.env.MAINNET_RPC = "http://localhost:8545";
    process.env.RPC_URL = "http://localhost:8545";
    
    nock.cleanAll();
    nock("http://localhost:8545")
      .post("/")
      .reply(200, (_uri, reqBody: any) => {
        const body = typeof reqBody === 'string' ? JSON.parse(reqBody) : reqBody;
        if (body.method === "eth_getCode" && body.params[0].toLowerCase() === "0x0000000000000000000000000000000000000005") {
          return { jsonrpc: "2.0", id: body.id, result: "0x" };
        }
        return { jsonrpc: "2.0", id: body.id, result: "0x" };
      });

    await expect(validateBridges(path.join(__dirname, "../tokens/temp-bridge.json"))).rejects.toThrow();
  });
});
