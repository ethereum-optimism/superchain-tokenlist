import fs from "fs";
import path from "path";
import * as glob from "glob";

async function main() {
  const allFiles = glob.sync(path.join(__dirname, "../tokens/**/*.json"));
  const tokens = allFiles.map((filePath) => {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  });
  
  // Extract unique chain IDs from all tokens
  const chainIds = new Set<number>();
  tokens.forEach(token => {
    if (token.deployment) {
      chainIds.add(token.deployment.chainId);
    }
    if (token.deployments) {
      token.deployments.forEach((deployment: any) => {
        chainIds.add(deployment.chainId);
      });
    }
  });
  
  const payload = {
    generatedAt: new Date().toISOString(),
    tokens,
    metadata: {
      totalTokens: tokens.length,
      chains: Array.from(chainIds).sort(),
    },
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
  const chainTokens = new Map<number, any[]>();
  tokens.forEach(token => {
    // Handle both single deployment and multiple deployments
    const deployments = token.deployments || (token.deployment ? [token.deployment] : []);
    
    deployments.forEach((deployment: any) => {
      const chainId = deployment.chainId;
      if (!chainTokens.has(chainId)) {
        chainTokens.set(chainId, []);
      }
      chainTokens.get(chainId)!.push(token);
    });
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