# STACK.md — Lean Node 22 + npm Workspaces

> Extends `BASE.md`. Purposefully **lean** stack to minimize `node_modules` bloat and cognitive load. Agents **must not** introduce alternative toolchains.

## Supported Stack & Non‑Goals

* **Runtime:** Node **>=22** (engines enforced). ESM only (`"type": "module"`).
* **Workspace:** **npm workspaces** (no pnpm/bun/yarn). One repo, multiple packages.
* **Language:** TypeScript for source; plain JS allowed for tests.
* **Testing:** Node’s **built‑in** runner (`node --test`). No third‑party test libs.
* **Lint/Format:** **Biome** (formatter + linter + import sort) — single tool.
* **Build:** **tsdown** to build libraries for npm & GitHub Packages.
* **Typecheck:** `tsc --build` (incremental, references if monorepo).
* **CI/CD:** GitHub Workflows.
* **Release:** **bumpp** for version bump + tag; workflows publish on tag.

**Do not add:** alternate runners (Jest/Vitest), bundlers, task runners, extra package managers, or heavy polyfill libs. Prefer stdlib.

## Scripts (Contract)

These scripts are present in **every package** and wired in CI:

```jsonc
{
  "scripts": {
    "build": "tsdown",
    "check": "biome check .",
    "format": "biome check --write .",
    "typecheck": "tsc --build",
    "test": "node --test"
  }
}
```

### Notes for Agents

* **`build`**: produces ESM output in `dist/` with type declarations.
* **`check`**/**`format`**: lint+format with Biome. Run `format` before committing.
* **`typecheck`**: TS incremental build; no emit. Keep `tsconfig.json` minimal and strict.
* **`test`**: Node test runner picks up `**/*.test.js` or files in `test/`. See test layout below.
* **`@let-value/translate` error handling**: `LocaleTranslator` helpers log `console.warn` and return the untranslated source string when fallbacks are required; they must not throw so consumers remain resilient.

## TypeScript & Build

* **Erasable TypeScript syntax:**: starting from v22.6.0 Node supports TS syntax natively.
* **Exports map**: define explicit `exports` with `types` & `default`.
* **Strictness**: `strict: true`, `noImplicitOverride: true`, `noUncheckedIndexedAccess: true`.
* **Source maps**: enabled in `tsdown` for debugging & coverage.

## Tests (Node Runner)

* **Default:** write tests in **TS**. Use `assert/strict`.
* **Naming:** `*.test.ts`.
* **Structure:** Arrange‑Act‑Assert; avoid global state; fake timers via `timers/promises`.
* **Coverage:** prefer the built‑in:

  * quick summary: `node --test --experimental-test-coverage`
  * JSON files: `NODE_V8_COVERAGE=coverage node --test`
* **No 3rd‑party** mocks/expect libs. If you need helpers, write tiny local utilities.

## Biome (Format + Lint)

* Single source of truth: `biome.json` at repo root (extends into packages).
* **Commands**: `npm run check` (CI) and `npm run format` (local fix‑up).
* **Policy:** PRs failing Biome **cannot** merge.

## CI/CD (GitHub Workflows)

* **`/.github/workflows/pr.yml`**: runs on PRs;
* **`/.github/workflows/release.yml`**: runs on tags.

## Release Flow (bumpp)

* Bump & tag locally; push; CI publishes.

## Test Layout & Conventions

* **No sleeps**; use fake timers or deterministic inputs.
* Each test file mirrors a module: `src/foo.ts` → `tests/foo.test.ts`.
* Avoid fixtures that hide behavior; use tiny builders.

## Dependency Policy (No‑Bloat)

* New runtime deps require justification (size, alternatives). Prefer stdlib.
* PR template must include “why this dependency?” for any new addition.

## Publishing Notes

* Ensure `files: ["dist"]` is set; never publish `src/`.
* Confirm `engines.node >= 22`; consumers on older Node must transpile on their side.
* Keep semantic versioning. Breaking changes require major bump + deprecation note.

## Quick Start (for Agents)

1. **SOLVE:** implement minimal change in `src/`, update/ add a small JS test in `tests/`, run `npm run format && npm run test`.
2. **HARDEN:** lint/type/build/test/coverage, add logs if needed, update docs.
3. **POLISH:** refactor‑only cleanup; ensure exports/types clean; delete dead code.
