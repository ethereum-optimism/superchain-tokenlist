import fs from "fs";
import path from "path";
import * as glob from "glob";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

interface TokenEntry {
  coinGeckoId: string;
}

async function verifyCoinGeckoId(id: string) {
  const url = `https://api.coingecko.com/api/v3/coins/${id}`;
  let attempt = 0;
  let delay = 1000; // start at 1s
  while (attempt < 5) {
    try {
      await axios.get(url);
      return; // success
    } catch (err: any) {
      if (err.response && err.response.status === 429) {
        // Rate-limited. Backoff.
        console.warn(`429 from CoinGecko for ${id}, retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
        delay *= 2;
        attempt++;
        continue;
      }
      if (err.response && err.response.status === 404) {
        throw new Error(`CoinGecko ID not found: ${id}`);
      }
      throw new Error(`Failed to fetch CoinGecko for ${id}: ${err.message}`);
    }
  }
  throw new Error(`Exceeded retry attempts for CoinGecko ID: ${id}`);
}

async function checkSingle(filePath: string) {
  const raw = fs.readFileSync(filePath, "utf-8");
  const entry: TokenEntry = JSON.parse(raw) as any;
  const id = entry.coinGeckoId;
  if (!id || typeof id !== "string") {
    throw new Error(`coinGeckoId missing or invalid in ${filePath}`);
  }
  await verifyCoinGeckoId(id);
  console.log(`✔ CoinGecko ID valid for ${filePath}`);
}

// Custom concurrency limiter to replace p-limit
async function processWithLimit<T>(items: T[], limit: number, processor: (item: T) => Promise<void>): Promise<void> {
  const results: Promise<void>[] = [];
  const executing: Promise<void>[] = [];

  for (const item of items) {
    const promise = processor(item).then(() => {
      executing.splice(executing.indexOf(promise), 1);
    });
    results.push(promise);
    executing.push(promise);

    if (executing.length >= limit) {
      await Promise.race(executing);
    }
  }

  await Promise.all(results);
}

export async function validateCoinGecko(tokenFilesPattern?: string): Promise<void> {
  const pattern = tokenFilesPattern || path.join(__dirname, "../tokens/**/*.json");
  const allFiles = glob.sync(pattern);
  
  await processWithLimit(allFiles, 5, checkSingle);
  console.log("✔ All CoinGecko checks passed.");
}

async function main() {
  try {
    await validateCoinGecko();
    process.exit(0);
  } catch (e: any) {
    console.error("✖ CoinGecko validation failed:", e.message);
    process.exit(1);
  }
}

// Only run main if this script is executed directly
if (require.main === module) {
  main();
} 