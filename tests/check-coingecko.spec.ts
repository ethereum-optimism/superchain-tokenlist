// tests/check-coingecko.spec.ts

import fs from "fs";
import path from "path";
import nock from "nock";
import { execSync } from "child_process";

// Create a dummy JSON entry
const tempCGJson = path.join(__dirname, "temp-cg.json");
const cgEntry = {
  version: "1.0.0",
  token: {
    assetId: "cg-123",
    name: "CGToken",
    symbol: "CGT",
    logoURI: "https://example.com/logo.svg",
    description: "Testing CoinGecko",
    website: "https://example.com",
    x: "https://example.com",
  },
  deployment: {
    chainId: 1,
    address: "0x0000000000000000000000000000000000000006",
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
  coinGeckoId: "existing-coin",
  docs: "https://example.com/docs",
  lastVerified: "2025-06-04T00:00:00Z"
};
fs.writeFileSync(tempCGJson, JSON.stringify(cgEntry, null, 2));

describe("check-coingecko script", () => {
  afterAll(() => {
    fs.unlinkSync(tempCGJson);
    nock.cleanAll();
  });

  it("passes when CoinGecko ID exists", () => {
    nock("https://api.coingecko.com")
      .get("/api/v3/coins/existing-coin")
      .reply(200, { id: "existing-coin", symbol: "ecg" });

    let exitCode = 0;
    try {
      execSync(`ts-node scripts/check-coingecko.ts`, { stdio: "ignore" });
    } catch (e: any) {
      exitCode = e.status;
    }
    expect(exitCode).toBe(0);
  });

  it("fails when CoinGecko ID is missing", () => {
    nock.cleanAll();
    nock("https://api.coingecko.com")
      .get("/api/v3/coins/missing-coin")
      .reply(404, { error: "Not found" });

    // Overwrite coinGeckoId in temp file
    const missingEntry = { ...cgEntry, coinGeckoId: "missing-coin" };
    fs.writeFileSync(tempCGJson, JSON.stringify(missingEntry, null, 2));

    let exitCode = 0;
    try {
      execSync(`ts-node scripts/check-coingecko.ts`, { stdio: "ignore" });
    } catch (e: any) {
      exitCode = e.status;
    }
    expect(exitCode).not.toBe(0);
  });
});
