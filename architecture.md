# Superchain Tokenlist v3 Architecture

## Overview

The Superchain Tokenlist v3 is a comprehensive token registry and validation system for the Superchain ecosystem. It provides a structured, schema-driven approach to maintaining token metadata with multi-layer validation including on-chain verification, bridge validation, and external API integration.

## Core Components

### 1. Token Data Structure (`tokens/` directory)

**Purpose**: Stores individual token entries as JSON files
**Location**: `tokens/**/*.json`
**Schema**: Defined by `schema/token.schema.json`

Each token entry contains:
- **Token metadata**: name, symbol, assetId, logoURI, description, website, social links
- **Multi-chain deployment info**: Supports both single `deployment` (legacy) and multiple `deployments` (new format)
  - Single deployment: `deployment` field with chainId, contract address, decimals, token type
  - Multiple deployments: `deployments` array for cross-chain tokens
- **Bridge configurations**: cross-chain bridge relationships and types
- **External integrations**: CoinGecko ID, documentation links
- **Verification timestamps**: last validation date

**Multi-chain Support**: 
- **Legacy format**: Single `deployment` field for tokens on one chain
- **New format**: `deployments` array for tokens deployed across multiple chains
- **Validation**: Schema enforces exactly one of `deployment` or `deployments` must be present

### 2. Schema System (`schema/` directory)

**Core Files**:
- `token.schema.json`: JSON Schema definition for token entries
- `token.ts`: Auto-generated TypeScript interfaces

**Key Features**:
- Strict validation rules for all token fields
- Pattern matching for addresses, symbols, and URLs
- Enum constraints for token types and bridge configurations
- Automatic TypeScript type generation via `json-schema-to-typescript`

**Token Types Supported**:
- `OptimismMintableERC20`: Standard Optimism bridgeable tokens
- `SuperchainERC20`: Next-generation Superchain tokens
- `ETH`: Native Ethereum
- `NativeUSDC`: Native USDC implementations

### 3. Validation Scripts (`scripts/` directory)

#### Schema Validation (`lint-schema.ts`)
- Validates all token JSON files against the schema
- Uses AJV validator for comprehensive error reporting
- Ensures structural integrity of token data

#### On-chain Verification (`check-onchain.ts`)
- Verifies contract existence and metadata consistency
- Validates token name, symbol, and decimals against on-chain data
- Checks contract verification status on block explorers
- Supports multiple Superchain networks: Ethereum, Optimism, Base
- Uses Viem for reliable blockchain interactions

#### Bridge Validation (`check-bridges.ts`)
- Validates bridge contract deployments
- Distinguishes between standard and custom bridges
- Verifies bridge contract existence on target chains
- *Note: Standard bridge predeploy computation is a TODO*

#### External API Integration (`check-coingecko.ts`)
- Validates CoinGecko integration for price data
- Implements rate limiting and retry logic
- Ensures external data source reliability

#### Package Generation (`gen-package.ts`)
- Aggregates all token entries into a unified `dist/tokenlist.json`
- Generates per-chain tokenlists (`dist/tokenlist-{chainId}.json`) for easier consumption
- Adds generation timestamp and metadata for cache management
- Supports both legacy single-deployment and new multi-deployment formats
- Creates comprehensive distribution packages for various use cases

#### CODEOWNERS Generation (`generate-codeowners.ts`)
- Automatically assigns GitHub review teams based on token deployment chains
- Supports both single `deployment` and multiple `deployments` token formats
- Maps chain IDs to appropriate review teams (e.g., Base tokens → @base-org/reviewers)
- Generates `.github/CODEOWNERS` file with per-file team assignments
- Includes fallback reviewers for unsupported chains
- Deduplicates team assignments for multi-chain tokens
- Provides special protection for schema and core infrastructure files

### 4. Testing Framework (`tests/` directory)

**Test Structure**:
- `schema.spec.ts`: Schema validation tests
- `multi-chain-schema.spec.ts`: Multi-chain token validation tests
- `generate-codeowners-unit.spec.ts`: CODEOWNERS generation logic tests
- `gen-package-logic.spec.ts`: Package generation tests
- `check-*.spec.ts`: Individual validation script tests
- Uses Jest with TypeScript support
- Includes both positive and negative test cases

**Test Coverage**:
- Multi-chain schema validation (single vs multiple deployments)
- CODEOWNERS team assignment logic
- Package generation for unified and per-chain outputs
- Schema validation edge cases
- Mock external API responses
- Error handling scenarios
- Integration test patterns

### 5. CI/CD Pipeline (CircleCI)

**Pipeline Stages**:
1. **Validation**: Run all validation scripts
2. **Testing**: Execute Jest test suite
3. **Package Generation**: Create distribution files
4. **Publishing**: Deploy to GitHub Pages and npm

**Key Features**:
- Automated validation on all PRs
- Branch protection with required status checks
- Secrets management via CircleCI contexts
- Automated issue creation for failed validations

### 6. Configuration Files

#### Build Configuration
- `tsconfig.json`: TypeScript compiler configuration
- `jest.config.ts`: Test framework setup
- `package.json`: Dependencies and scripts including multi-chain validation

#### Operational Configuration
- `OPERATIONAL_RUNBOOK.md`: Incident response procedures
- `.env` (local): Environment variables for development
- CircleCI context: Production secrets and API keys

#### Automated Team Assignment
- `scripts/generate-codeowners.ts`: Automated CODEOWNERS generation
- `.github/CODEOWNERS`: Auto-generated file mapping token files to review teams
- Chain-specific team assignments based on deployment targets

**Supported Chain Teams**:
- Ethereum ecosystem (1, 5, 11155111): `@OP-Labs/reviewers`
- Optimism ecosystem (10, 420, 11155420): `@OP-Labs/reviewers`
- Base ecosystem (8453, 84531, 84532): `@base-org/reviewers`
- Fallback for additional chains: `@OP-Labs/reviewers`

## Data Flow Architecture

```
Token JSON Files (tokens/)
    ↓
Schema Validation (lint-schema.ts)
    ↓ (supports both single deployment and multi-deployment formats)
On-chain Verification (check-onchain.ts)
    ↓ (validates all deployments across chains)
Bridge Validation (check-bridges.ts)
    ↓
External API Validation (check-coingecko.ts)
    ↓
CODEOWNERS Generation (generate-codeowners.ts)
    ↓ (assigns reviewers based on chain deployments)
Package Generation (gen-package.ts)
    ↓
Distribution Files:
    ├── dist/tokenlist.json (unified)
    └── dist/tokenlist-{chainId}.json (per-chain)
```

## Integration Points

### Blockchain Networks
- **Ethereum Mainnet**: Primary L1 integration
- **Optimism**: Core L2 implementation
- **Base**: Coinbase L2 integration
@TODO add all additional networks

### External Services
- **Block Explorers**: Blockscout instances for all supported chains
- **CoinGecko API**: Price and market data integration
- **RPC Providers**: Configurable via environment variables

### Development Tools
- **Viem**: Ethereum client library for on-chain interactions
- **AJV**: JSON Schema validation
- **Axios**: HTTP client for external APIs
- **TypeScript**: Type safety and developer experience

## Security Considerations

### Validation Layers
1. **Schema Validation**: Structural integrity
2. **On-chain Verification**: Contract existence and metadata consistency
3. **Bridge Validation**: Cross-chain functionality verification
4. **External API Validation**: Third-party integration reliability

### Rate Limiting
- CoinGecko API: Exponential backoff with retry logic
- Concurrent validation: Limited to 5 parallel operations
- RPC calls: Configurable endpoints with fallback options

### Data Integrity
- Immutable token entries with versioning
- Timestamp-based verification tracking
- Comprehensive error logging and reporting

## Deployment Strategy

### Development Workflow
1. Token entries added to `tokens/` directory
2. Automated validation via PR checks
3. Code review by designated CODEOWNERS
4. Auto-merge upon validation success

### Production Deployment
1. Nightly package generation
2. GitHub Pages hosting for JSON distribution
3. npm package publishing for programmatic access
4. Automated issue creation for failed validations

## Future Enhancements

### Planned Improvements
- Standard bridge predeploy address computation
- Blockscout integration for additional chains
- Superchain Registry integration
- Enhanced monitoring and alerting

### Scalability Considerations
- Modular validation architecture supports new chains
- Extensible schema system for new token types
- Configurable validation rules per chain
- Performance optimization for large token sets

## Operational Procedures

### Common Maintenance Tasks
- RPC endpoint updates during outages
- New chain integration procedures
- Token removal and deprecation workflows
- Secret rotation and access management

### Monitoring and Alerting
- Validation failure notifications
- External API rate limit monitoring
- CI/CD pipeline health checks
- Distribution package integrity verification

This architecture provides a robust, scalable foundation for managing token metadata across the Superchain ecosystem while maintaining high standards for data integrity and operational reliability.