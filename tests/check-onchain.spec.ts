// tests/check-onchain.spec.ts

import fs from "fs";
import path from "path";
import nock from "nock";
import { execSync } from "child_process";
import { createPublicClient, http, type PublicClient } from "viem";
import { mainnet } from "viem/chains";

// 1. Mock RPC responses for getBytecode and readContract
// 2. Mock Etherscan API

const dummyAddress = "0x0000000000000000000000000000000000000003";
const dummyChainId = 1;

// A minimal valid JSON file for test
const tempJsonPath = path.join(__dirname, "temp-token.json");
const tokenEntry = {
  version: "1.0.0",
  token: {
    assetId: "abc-123",
    name: "MockToken",
    symbol: "MOCK",
    logoURI: "https://example.com/logo.svg",
    description: "Mock token for tests",
    website: "https://example.com",
    x: "https://example.com",
  },
  deployment: {
    chainId: dummyChainId,
    address: dummyAddress,
    decimals: 18,
    type: "SuperchainERC20",
  },
  bridges: [
    { fromChainId: 1, toChainId: 10, standardBridge: true },
  ],
  coinGeckoId: "mock-token",
  docs: "https://example.com/docs",
  lastVerified: "2025-06-04T00:00:00Z",
};
fs.writeFileSync(tempJsonPath, JSON.stringify(tokenEntry, null, 2));

describe("check-onchain script", () => {
  let publicClient: PublicClient;

  beforeAll(() => {
    // Create a PublicClient pointing to a local stub (we'll intercept via nock)
    publicClient = createPublicClient({ chain: mainnet, transport: http("http://localhost:8545") });
  });

  afterAll(() => {
    fs.unlinkSync(tempJsonPath);
    nock.cleanAll();
  });

  it("exits with code 0 when onchain data matches", () => {
    // 1. Stub getBytecode
    nock("http://localhost:8545")
      .post("/")
      .reply(200, (_uri, requestBody: any) => {
        const body = JSON.parse(requestBody);
        if (body.method === "eth_getCode") {
          return { jsonrpc: "2.0", id: body.id, result: "0x6001600155" };
        }
        // 2. Stub name(), symbol(), decimals() via Ethers JSON-RPC eth_call
        if (body.method === "eth_call") {
          // Inspect data to decide which function was called
          const data: string = body.params[0].data;
          if (data.startsWith("0x06fdde03")) {
            // name()
            return {
              jsonrpc: "2.0",
              id: body.id,
              result:
                "0x00000000000000000000000000000000000000000000000000000000000000204d6f636b546f6b656e",
            };
          }
          if (data.startsWith("0x95d89b41")) {
            // symbol()
            return {
              jsonrpc: "2.0",
              id: body.id,
              result:
                "0x00000000000000000000000000000000000000000000000000000000000000044d4f434b",
            };
          }
          if (data.startsWith("0x313ce567")) {
            // decimals()
            return { jsonrpc: "2.0", id: body.id, result: "0x12" }; // 18
          }
        }
        return { jsonrpc: "2.0", id: body.id, result: null };
      });

    // 3. Stub Etherscan source verification API
    nock("https://api.etherscan.io")
      .get("/api")
      .query((q) => q.module === "contract" && q.action === "getsourcecode" && q.address === dummyAddress)
      .reply(200, {
        status: "1",
        message: "OK",
        result: [{ SourceCode: "contract mock {}", ABI: "[]" }],
      });

    // Run the script via CLI and capture the exit code
    let exitCode = 0;
    try {
      execSync(`ts-node scripts/check-onchain.ts`, { stdio: "ignore" });
    } catch (e: any) {
      exitCode = e.status;
    }
    expect(exitCode).toBe(0);
  });

  it("fails when name mismatches", () => {
    // Same stubs as above, but return a different name
    nock.cleanAll();
    nock("http://localhost:8545")
      .post("/")
      .reply(200, (_uri, requestBody: any) => {
        const body = JSON.parse(requestBody);
        if (body.method === "eth_getCode") {
          return { jsonrpc: "2.0", id: body.id, result: "0x6001600155" };
        }
        if (body.method === "eth_call") {
          const data: string = body.params[0].data;
          if (data.startsWith("0x06fdde03")) {
            // name() returns WRONGNAME
            return {
              jsonrpc: "2.0",
              id: body.id,
              result:
                "0x000000000000000000000000000000000000000000000000000000000000000952524f4e474e414d45",
            };
          }
          if (data.startsWith("0x95d89b41")) {
            return {
              jsonrpc: "2.0",
              id: body.id,
              result:
                "0x00000000000000000000000000000000000000000000000000000000000000044d4f434b",
            };
          }
          if (data.startsWith("0x313ce567")) {
            return { jsonrpc: "2.0", id: body.id, result: "0x12" };
          }
        }
        return { jsonrpc: "2.0", id: body.id, result: null };
      });

    nock("https://api.etherscan.io")
      .get("/api")
      .query((q) => q.module === "contract" && q.action === "getsourcecode" && q.address === dummyAddress)
      .reply(200, {
        status: "1",
        message: "OK",
        result: [{ SourceCode: "contract mock {}", ABI: "[]" }],
      });

    let exitCode = 0;
    try {
      execSync(`ts-node scripts/check-onchain.ts`, { stdio: "ignore" });
    } catch (e: any) {
      exitCode = e.status;
    }
    expect(exitCode).not.toBe(0);
  });
});
