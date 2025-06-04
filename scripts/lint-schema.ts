// Validate every JSON in tokens/**/*.json against schema/token.schema.json using Ajv.

import fs from "fs";
import path from "path";
import Ajv from "ajv";
import glob from "glob";
import tokenSchema from "../schema/token.schema.json";

const validator = new Ajv({ allErrors: true });
const validate = validator.compile(tokenSchema);

function getAllJsonFiles(dir: string): string[] {
  return glob.sync(path.join(dir, "/**/*.json"));
}

async function main() {
  const files = getAllJsonFiles(path.resolve(__dirname, "../tokens"));
  let hasError = false;

  for (const filePath of files) {
    const raw = fs.readFileSync(filePath, "utf-8");
    try {
      const obj = JSON.parse(raw);
      const valid = validate(obj);
      if (!valid) {
        console.error(`✖ Validation errors in ${filePath}:`);
        for (const err of validate.errors!) {
          console.error(`  • ${err.instancePath} ${err.message}`);
        }
        hasError = true;
      }
    } catch (e) {
      console.error(`✖ Failed to parse JSON ${filePath}:`, e);
      hasError = true;
    }
  }

  if (hasError) {
    process.exit(1);
  } else {
    console.log("✔ All token JSON files conform to schema.");
    process.exit(0);
  }
}

main();
