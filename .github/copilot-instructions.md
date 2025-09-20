# Copilot Instructions

## Core Methodology
Use **SOLVE → HARDEN → POLISH** for all changes:
- **SOLVE**: Minimal correct behavior, basic unit tests, compiles/runs
- **HARDEN**: Full Definition of Done, coverage gates, integration/E2E tests  
- **POLISH**: Refactor-only cleanup, naming, dead code removal

## Quality Gates
- Prefer clear, typed, tested code over clever solutions
- Changed files must meet coverage gates (≥85% lines, ≥80% branches)
- If a user-flow changes, add E2E tests
- All commits must pass: `npm run format && npm run check && npm run typecheck && npm run test`

## Tech Stack (Node 22 + TypeScript)
- **Runtime**: Node ≥22, ESM only (`"type": "module"`)
- **Workspace**: npm workspaces (no pnpm/bun/yarn alternatives)
- **Testing**: Node built-in runner (`node --test`), no third-party test libs
- **Lint/Format**: Biome only (`npm run format` before commits)
- **Build**: tsdown for libraries, `tsc --build` for type checking
- **Scripts**: Every package has `build`, `check`, `format`, `typecheck`, `test`

## Code Standards
- **Clarity > Cleverness**: Choose simplest design that meets requirements
- **Small, reversible steps**: Keep PRs focused and blast radius low
- **Fail fast**: Validate inputs early, bubble up typed errors
- **No new dependencies** without justification (prefer stdlib)
- **Backwards compatibility**: Additive changes first, deprecate with timeline

## Testing Requirements
- **Structure**: Arrange-Act-Assert, one behavior per test
- **Deterministic**: No sleeps, use fake timers, control IO/randomness
- **Naming**: `*.test.ts` files, mirror structure (`src/foo.ts` → `tests/foo.test.ts`)
- **Coverage**: Test through public contracts, not internals
- **E2E**: Required when user flows change

## Security & Performance
- **Validate at boundaries**: Sanitize inputs, encode outputs
- **No secrets in code**: Use environment variables, redact from logs
- **Resource budgets**: Stay within latency/memory constraints
- **Observability**: Add structured logs for new paths with correlation IDs

## Reference Docs
- **Canonical rules**: `/docs/BASE.md` (comprehensive engineering principles)
- **Tech stack details**: `/docs/STACK.md` (Node/TypeScript specifics)
- **Quick reference**: `/AGENTS.md` (5-line summary)

## Workflow
1. Run existing tests to establish baseline
2. Create failing test for new behavior (if applicable)
3. Implement minimal solution (SOLVE phase)
4. Add integration tests, coverage, observability (HARDEN phase)  
5. Clean up code structure while preserving behavior (POLISH phase)
6. Verify all quality gates pass before submitting