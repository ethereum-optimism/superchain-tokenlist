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
  console.log(`✔ Generated tokenlist.json with ${tokens.length} entries at ${outPath}`);
}

main().catch((e) => {
  console.error("✖ Failed to generate package:", e);
  process.exit(1);
}); 