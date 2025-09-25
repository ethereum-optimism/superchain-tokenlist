// tests/check-coingecko.spec.ts

import fs from "fs";
import path from "path";
import nock from "nock";
import { validateCoinGecko } from "../scripts/check-coingecko";

// Create a dummy JSON entry in tokens/ directory so the script can find it
const tempCGJson = path.join(__dirname, "../tokens/temp-cg.json");
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

  it("passes when CoinGecko ID exists", async () => {
    nock("https://api.coingecko.com")
      .get("/api/v3/coins/existing-coin")
      .reply(200, { id: "existing-coin", symbol: "ecg" });

    await expect(validateCoinGecko(tempCGJson)).resolves.not.toThrow();
  });

  it("fails when CoinGecko ID is missing", async () => {
    nock.cleanAll();
    nock("https://api.coingecko.com")
      .get("/api/v3/coins/missing-coin")
      .reply(404, { error: "Not found" });

    // Overwrite coinGeckoId in temp file
    const missingEntry = { ...cgEntry, coinGeckoId: "missing-coin" };
    fs.writeFileSync(tempCGJson, JSON.stringify(missingEntry, null, 2));

    await expect(validateCoinGecko(tempCGJson)).rejects.toThrow();
  });
});
