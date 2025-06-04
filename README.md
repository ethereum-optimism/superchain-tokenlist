# Superchain Token List v3

This repository hosts the v3 tokenlist schema and registry for Superchain.  
It provides:
- Off-chain, GitHub-hosted JSON files per chain under `tokens/`
- Schema definitions in `schema/`
- Validation & generation scripts in `scripts/`
- CI/CD via CircleCI
- Nightly concatenation of all tokens into `dist/tokenlist.json`

## Folder Structure

- `tokens/` – individual JSON entries
- `schema/` – JSON Schema + generated TypeScript types
- `scripts/` – validation & packaging scripts
- `.circleci/` – CI pipeline
- `.github/` – labeler & CODEOWNERS
- `tests/` – Jest unit/integration tests
- `OPERATIONAL_RUNBOOK.md` – runbook
