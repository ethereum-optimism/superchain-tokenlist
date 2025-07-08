import fs from "fs";
import path from "path";
import * as glob from "glob";

interface ChainTeamMapping {
  [chainId: number]: string[];
}

// Chain ID to team mapping - extend this as more chains are added
const CHAIN_TEAMS: ChainTeamMapping = {
  // Ethereum ecosystem
  1: ["@OP-Labs/reviewers"],           // Ethereum Mainnet
  5: ["@OP-Labs/reviewers"],           // Ethereum Goerli
  11155111: ["@OP-Labs/reviewers"],    // Ethereum Sepolia
  
  // Optimism ecosystem
  10: ["@OP-Labs/reviewers"],          // Optimism Mainnet
  420: ["@OP-Labs/reviewers"],         // Optimism Goerli
  11155420: ["@OP-Labs/reviewers"],    // Optimism Sepolia
  
  // Base ecosystem
  8453: ["@base-org/reviewers"],       // Base Mainnet
  84531: ["@base-org/reviewers"],      // Base Goerli
  84532: ["@base-org/reviewers"],      // Base Sepolia
  
  // Arbitrum ecosystem
  42161: ["@arbitrum/reviewers"],      // Arbitrum One
  421613: ["@arbitrum/reviewers"],     // Arbitrum Goerli
  421614: ["@arbitrum/reviewers"],     // Arbitrum Sepolia
  
  // Add more chains as needed
  // Example: 137: ["@polygon/reviewers"], // Polygon
};

interface TokenEntry {
  token: {
    name: string;
    symbol: string;
  };
  deployment?: {
    chainId: number;
    address: string;
    decimals: number;
    type: string;
  };
  deployments?: Array<{
    chainId: number;
    address: string;
    decimals: number;
    type: string;
  }>;
}

function getAllDeployments(token: TokenEntry): Array<{ chainId: number; address: string; decimals: number; type: string }> {
  // Support both old format (single deployment) and new format (multiple deployments)
  if (token.deployments) {
    return token.deployments;
  } else if (token.deployment) {
    return [token.deployment];
  } else {
    throw new Error("Token entry must have either 'deployment' or 'deployments' field");
  }
}

function getTeamsForChains(chainIds: number[]): string[] {
  const teams = new Set<string>();
  
  chainIds.forEach(chainId => {
    const chainTeams = CHAIN_TEAMS[chainId];
    if (chainTeams) {
      chainTeams.forEach(team => teams.add(team));
    } else {
      console.warn(`⚠️  No team mapping found for chainId ${chainId}, using fallback reviewers`);
      teams.add("@OP-Labs/reviewers");
    }
  });
  
  return Array.from(teams).sort();
}

export function generateCodeowners(): void {
  const tokensDir = path.join(__dirname, "../tokens");
  const codeownersPath = path.join(__dirname, "../.github/CODEOWNERS");
  
  // Check if tokens directory exists
  if (!fs.existsSync(tokensDir)) {
    console.warn("⚠️  tokens/ directory not found, creating minimal CODEOWNERS");
    const minimalCodeowners = `# Auto-generated CODEOWNERS
# No token files found - using fallback reviewers

# Fallback for all files
* @OP-Labs/reviewers
`;
    fs.writeFileSync(codeownersPath, minimalCodeowners);
    return;
  }

  const allFiles = glob.sync(path.join(tokensDir, "**/*.json"));
  
  if (allFiles.length === 0) {
    console.warn("⚠️  No token files found, creating minimal CODEOWNERS");
    const minimalCodeowners = `# Auto-generated CODEOWNERS
# No token files found - using fallback reviewers

# Fallback for all files
* @OP-Labs/reviewers
`;
    fs.writeFileSync(codeownersPath, minimalCodeowners);
    return;
  }

  const fileTeamMap = new Map<string, string[]>();
  const processedTokens: string[] = [];

  allFiles.forEach(filePath => {
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      const token: TokenEntry = JSON.parse(raw);
      
      const deployments = getAllDeployments(token);
      const chainIds = deployments.map(d => d.chainId);
      const teams = getTeamsForChains(chainIds);
      
      const relativePath = path.relative(path.join(__dirname, ".."), filePath);
      fileTeamMap.set(relativePath, teams);
      
      processedTokens.push(`${token.token.symbol} (${chainIds.join(", ")})`);
      
    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error);
      // Use fallback reviewers for problematic files
      const relativePath = path.relative(path.join(__dirname, ".."), filePath);
      fileTeamMap.set(relativePath, ["@OP-Labs/reviewers"]);
    }
  });

  // Generate CODEOWNERS content
  let codeownersContent = `# Auto-generated CODEOWNERS based on token deployments
# Generated on: ${new Date().toISOString()}
# 
# This file is automatically updated when token files change.
# Do not edit manually - changes will be overwritten.
#
# Processed tokens: ${processedTokens.length}
# ${processedTokens.map(t => `#   - ${t}`).join('\n')}

`;

  // Sort files for consistent output
  const sortedFiles = Array.from(fileTeamMap.entries()).sort(([a], [b]) => a.localeCompare(b));
  
  sortedFiles.forEach(([filePath, teams]) => {
    codeownersContent += `${filePath} ${teams.join(" ")}\n`;
  });

  codeownersContent += `
# Schema and core files require security team review
/schema/** @OP-Labs/reviewers @OP-Labs/security-team
/scripts/** @OP-Labs/reviewers @OP-Labs/security-team
/.circleci/** @OP-Labs/reviewers @OP-Labs/security-team

# Fallback for any unmatched files
* @OP-Labs/reviewers
`;

  // Ensure .github directory exists
  const githubDir = path.join(__dirname, "../.github");
  if (!fs.existsSync(githubDir)) {
    fs.mkdirSync(githubDir, { recursive: true });
  }

  fs.writeFileSync(codeownersPath, codeownersContent);
  
  console.log("✅ Generated CODEOWNERS with chain-specific assignments");
  console.log(`   - Processed ${allFiles.length} token files`);
  console.log(`   - Assigned teams based on ${Object.keys(CHAIN_TEAMS).length} supported chains`);
  
  // Log team assignments summary
  const teamUsage = new Map<string, number>();
  fileTeamMap.forEach(teams => {
    teams.forEach(team => {
      teamUsage.set(team, (teamUsage.get(team) || 0) + 1);
    });
  });
  
  console.log("   - Team assignments:");
  teamUsage.forEach((count, team) => {
    console.log(`     ${team}: ${count} files`);
  });
}

// Run the generator when called directly
if (require.main === module) {
  try {
    generateCodeowners();
    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to generate CODEOWNERS:", error);
    process.exit(1);
  }
}