import fs from "fs";
import path from "path";
import glob from "glob";

async function main() {
  const allFiles = glob.sync(path.join(__dirname, "../tokens/**/*.json"));
  const tokens = allFiles.map((filePath) => {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  });
  const payload = {
    generatedAt: new Date().toISOString(),
    tokens,
  };
  // Ensure dist/ exists
  const distDir = path.resolve(__dirname, "../dist");
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }
  const outPath = path.join(distDir, "tokenlist.json");
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
  console.log(`✔ Generated tokenlist.json with ${tokens.length} entries from ${allFiles.length} source files at ${outPath}`);
  console.log(`   Chains covered: ${payload.metadata.chains.join(', ')}`);
  
  // Also generate per-chain tokenlists for easier consumption
  const chainTokens = new Map<number, TokenEntry[]>();
  tokens.forEach(token => {
    const chainId = token.deployment?.chainId;
    if (chainId) {
      if (!chainTokens.has(chainId)) {
        chainTokens.set(chainId, []);
      }
      chainTokens.get(chainId)!.push(token);
    }
  });
  
  // Write per-chain files
  chainTokens.forEach((chainTokenList, chainId) => {
    const chainPayload = {
      generatedAt: new Date().toISOString(),
      chainId,
      tokens: chainTokenList,
      metadata: {
        totalTokens: chainTokenList.length,
        chainId,
      },
    };
    const chainOutPath = path.join(distDir, `tokenlist-${chainId}.json`);
    fs.writeFileSync(chainOutPath, JSON.stringify(chainPayload, null, 2));
    console.log(`   Generated chain-specific list: tokenlist-${chainId}.json (${chainTokenList.length} tokens)`);
  });
}

main().catch((e) => {
  console.error("✖ Failed to generate package:", e);
  process.exit(1);
}); 