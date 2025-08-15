// tests/check-onchain.spec.ts

import fs from "fs";
import path from "path";
import nock from "nock";
import { validateOnchain } from "../scripts/check-onchain";
import { createPublicClient, http, type PublicClient } from "viem";
import { mainnet } from "viem/chains";

// 1. Mock RPC responses for getBytecode and readContract
// 2. Mock Etherscan API

const dummyAddress = "0x0000000000000000000000000000000000000003";
const dummyChainId = 1;

// A minimal valid JSON file for test
const tempJsonPath = path.join(__dirname, "../tokens/temp-token.json");
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

  it("exits with code 0 when onchain data matches", async () => {
    // Set environment variables for the test
    process.env.MAINNET_RPC = "http://localhost:8545";
    process.env.RPC_URL = "http://localhost:8545";

    // 1. Stub getBytecode
    nock("http://localhost:8545")
      .persist()
      .post("/", (body) => {
        return body.method === "eth_getCode" || body.method === "eth_call";
      })
      .reply(200, (uri, requestBody: any) => {
        const body = requestBody;
        if (body.method === "eth_getCode") {
          return { jsonrpc: "2.0", id: body.id, result: "0x6001600155" };
        }
        // 2. Stub name(), symbol(), decimals() via Ethers JSON-RPC eth_call
        if (body.method === "eth_call") {
          // Inspect data to decide which function was called
          const data: string = body.params[0].data;
          if (data.startsWith("0x06fdde03")) {
            // name() - ABI encoded string "MockToken" (9 chars = 0x09)
            return {
              jsonrpc: "2.0",
              id: body.id,
              result:
                "0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000094d6f636b546f6b656e0000000000000000000000000000000000000000000000",
            };
          }
          if (data.startsWith("0x95d89b41")) {
            // symbol() - ABI encoded string "MOCK" (4 chars = 0x04)
            return {
              jsonrpc: "2.0",
              id: body.id,
              result:
                "0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000044d4f434b00000000000000000000000000000000000000000000000000000000",
            };
          }
          if (data.startsWith("0x313ce567")) {
            // decimals() - uint8 value 18 (0x12) padded to 32 bytes
            return { jsonrpc: "2.0", id: body.id, result: "0x0000000000000000000000000000000000000000000000000000000000000012" };
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

    await expect(validateOnchain(tempJsonPath)).resolves.not.toThrow();
  });

  it("fails when name mismatches", async () => {
    // Set environment variables for the test
    process.env.MAINNET_RPC = "http://localhost:8545";
    process.env.RPC_URL = "http://localhost:8545";

    // Same stubs as above, but return a different name
    nock.cleanAll();
    nock("http://localhost:8545")
      .persist()
      .post("/", (body) => {
        return body.method === "eth_getCode" || body.method === "eth_call";
      })
      .reply(200, (uri, requestBody: any) => {
        const body = requestBody;
        if (body.method === "eth_getCode") {
          return { jsonrpc: "2.0", id: body.id, result: "0x6001600155" };
        }
        if (body.method === "eth_call") {
          const data: string = body.params[0].data;
          if (data.startsWith("0x06fdde03")) {
            // name() returns WRONGNAME (9 chars = 0x09)
            return {
              jsonrpc: "2.0",
              id: body.id,
              result:
                "0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000095752524f4e474e414d450000000000000000000000000000000000000000000",
            };
          }
          if (data.startsWith("0x95d89b41")) {
            return {
              jsonrpc: "2.0",
              id: body.id,
              result:
                "0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000044d4f434b00000000000000000000000000000000000000000000000000000000",
            };
          }
          if (data.startsWith("0x313ce567")) {
            return { jsonrpc: "2.0", id: body.id, result: "0x0000000000000000000000000000000000000000000000000000000000000012" };
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

    await expect(validateOnchain(tempJsonPath)).rejects.toThrow();
  });
});
