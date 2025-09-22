# Refactoring Roadmap

This roadmap organizes behaviour-preserving refactors into incremental passes so multiple agents can parallelize the work while staying within the SOLVE → HARDEN → POLISH expectations from `docs/BASE.md`. Each project section groups work by area and then by the concrete refactoring purpose.

## Project: `@let-value/translate`

### Area: LocaleTranslator workflow

> **Error handling policy:** LocaleTranslator entry points never throw when fallbacks are required. They log a `console.warn`
> describing the missing translation or unsupported input and return the untranslated source string (or `translate()` fallback)
> so consumers remain resilient. Preserve this contract when refactoring helpers and tests.

#### Purpose: clarify translation flow and eliminate duplication
- [x] **Pass A — add guard-rail tests:** introduce focused unit tests for `LocaleTranslator.message`, `.plural`, and `.context` covering context overrides and placeholder substitution before touching internals.【F:translate/src/translator.ts†L42-L116】
- **Pass B — extract pure helpers:** split context-aware translation logic into pure functions (e.g., `selectTranslation`, `resolvePluralForm`) reused by `.message`, `.plural`, `.context`, and `pgettext`/`npgettext` to avoid repeated structural checks.【F:translate/src/translator.ts†L58-L146】
- **Pass C — de-duplicate substitution rules:** move the `values` selection (`form.values` vs. `forms[0].values`) out of `translatePlural` into a helper shared with the message path so placeholder handling lives in one place, reinforcing the “one source of truth” rule.【F:translate/src/translator.ts†L48-L56】

#### Purpose: enforce safer async locale loading
- **Pass A — characterize current caches:** document and test the edge cases around `translations`, `loaders`, `pending`, and `translators` maps when mixing parent translators and async loaders.【F:translate/src/translator.ts†L149-L224】
- **Pass B — isolate cache mutation:** refactor `fetchLocale` into a small state-machine module that centralizes transitions (`loader` → `pending` → `translations`) instead of mutating multiple maps inline; ensure thrown errors become typed errors per BASE §4.【F:translate/src/translator.ts†L170-L224】
- **Pass C — add eviction and race handling:** introduce idempotent cache updates (e.g., `finally` handlers to clear `pending`) and optional TTL hooks, keeping behaviour by default but instrumenting for observability (structured logs or hooks) to satisfy BASE §6 once the structure is clean.

### Area: Message builders and utils

#### Purpose: make template handling deterministic
- **Pass A — expand tests:** create golden tests for `message`, `plural`, and `context` to lock the contract around tagged templates, descriptor precedence, and assertion failures.【F:translate/src/messages.ts†L23-L76】
- **Pass B — normalize template handling:** replace the manual template loop with a shared template utility that guarantees identical placeholder numbering between `message` and `normalizeMessageId`, preventing drift.【F:translate/src/messages.ts†L26-L64】【F:translate/src/utils.ts†L32-L77】
- **Pass C — strengthen types:** replace `any[]` value typing with tagged tuple types or builder objects to make illegal states (e.g., mismatched placeholder counts) unrepresentable, aligning with BASE §1.【F:translate/src/messages.ts†L10-L41】

#### Purpose: harden plural utilities
- **Pass A — characterize plural edge cases:** add tests around `pluralFunc` fallback paths for locales with bogus plural rules and for invalid return values from `getPluralFunc` to prevent silent coercions.【F:translate/src/utils.ts†L84-L103】
- **Pass B — replace JSON-stringify memo cache:** update `memo` to accept structured keys (e.g., `Map<string,unknown>` or `WeakMap`) so non-serializable arguments no longer break caching and we avoid hidden bugs with order-dependent objects.【F:translate/src/utils.ts†L17-L30】
- **Pass C — centralize normalization:** push the normalization of translation tables (`normalizeTranslations` and `mergeTranslations`) into a dedicated module with deterministic key ordering and explicit conflict strategy to uphold “one source of truth.”【F:translate/src/utils.ts†L67-L148】

## Project: `@let-value/translate-react`

### Area: Hooks and suspense integration

#### Purpose: align with modern React data APIs
- **Pass A — add suspense regression tests:** capture current behaviour of `useTranslations` when given fulfilled, pending, and rejected loaders, including manual promise decoration, so later refactors remain behaviour-preserving.【F:react/src/hooks/useTranslations.ts†L1-L46】
- **Pass B — remove legacy promise tagging:** refactor `getPromiseState` into a standalone resource manager or replace it entirely with React’s native `use`/`cache`, simplifying error paths while keeping thrown values consistent.【F:react/src/hooks/useTranslations.ts†L5-L45】
- **Pass C — surface typed errors and logging:** ensure missing providers throw typed errors that satisfy BASE §4/§6 (structured error objects) and expose instrumentation hooks for tracing locale fetch latency.

### Area: Context providers and components

#### Purpose: reduce direct `createElement` usage and improve composition
- **Pass A — snapshot current API:** add component tests (using React testing library or plain React DOM) to freeze the external behaviour of `LocaleProvider`, `TranslationsProvider`, `Message`, and `Plural` components.【F:react/src/components/LocaleProvider.ts†L1-L10】
- **Pass B — refactor to functional components:** replace manual `createElement` calls with JSX/`FC` definitions for readability while ensuring tree-shaking remains effective; co-locate prop validation and docs per BASE §7.【F:react/src/components/LocaleProvider.ts†L1-L10】
- **Pass C — consolidate context wiring:** unify `localeContext` and `translatorContext` provisioning into a single provider component that enforces dependency ordering and optional overrides, preventing runtime “missing provider” states.【F:react/src/context.ts†L1-L5】

## Project: `@let-value/translate-loader`

### Area: Loader runtime and bundler bindings

#### Purpose: make file IO predictable and cacheable
- **Pass A — introduce IO tests:** simulate loading `.po` files through the unplugin interface to lock down module shapes and ensure the JSON serialization remains stable across bundlers.【F:loader/src/index.ts†L1-L21】
- **Pass B — refactor `load` to async pipeline:** move from `readFileSync` to async `fs.promises.readFile` with deterministic caching so bundlers that support async loaders can avoid blocking the event loop, while keeping backwards compatibility.【F:loader/src/index.ts†L1-L21】
- **Pass C — share parsing utilities:** extract PO parsing and serialization into shared helpers reused by the `extract` project to ensure identical normalisation and encoding rules, eliminating duplicate logic across packages.【F:loader/src/index.ts†L12-L18】【F:extract/src/plugins/po/po.ts†L55-L88】

### Area: Framework adapters

#### Purpose: tighten typing for bundler exports
- **Pass A — audit adapters:** verify the generated wrappers for Rollup, Vite, Webpack, esbuild, and Rspack expose consistent types and tree-shake correctly; add tests or type assertions where possible.【F:loader/src/index.ts†L19-L21】【F:loader/src/rollup.ts†L1-L200】
- **Pass B — generate adapters programmatically:** replace hand-written adapter files with a template-driven factory that ensures new bundlers can be added with minimal risk.
- **Pass C — document plugin usage:** update README snippets per adapter to align with the unified API, satisfying BASE §7 documentation requirements once refactors land.

## Project: `@let-value/translate-extract`

### Area: Pipeline orchestration (`run.ts`)

#### Purpose: simplify task scheduling and deferred coordination
- **Pass A — add integration tests:** cover the queue/`Defer` coordination by simulating multiple plugins and ensuring ordering guarantees before refactoring.【F:extract/src/run.ts†L24-L118】
- **Pass B — separate scheduler from plugin hooks:** extract the task queue and deferred tracking into a dedicated module with clear invariants (e.g., no unbounded `pending` growth), improving clarity and enabling metrics (queue depth, wait time).【F:extract/src/run.ts†L24-L118】
- **Pass C — add error and cancellation handling:** introduce scoped try/catch with structured error events per BASE §5/§6 so one failing plugin can surface meaningful diagnostics without leaving deferred promises hanging.【F:extract/src/run.ts†L61-L118】

### Area: Configuration resolution

#### Purpose: enforce deterministic config shape
- **Pass A — cover resolution with tests:** ensure `defineConfig` handles arrays, functions, and defaults consistently to avoid regressions during refactor.【F:extract/src/configuration.ts†L117-L162】
- **Pass B — normalize entrypoints/excludes once:** create dedicated normalizers for `entrypoints` and `exclude` to avoid duplicating logic in plugins and to make per-entrypoint overrides explicit.【F:extract/src/configuration.ts†L122-L161】
- **Pass C — expose validation errors:** replace silent defaults with explicit validation (e.g., throw typed errors when entrypoints missing) and attach docs references, aligning with BASE §1 & §5.

### Area: Plugins (`core`, `po`, `cleanup`)

#### Purpose: strengthen plugin interfaces and observability
- **Pass A — snapshot plugin contracts:** add contract tests that assert the shape of `build.onResolve/onLoad/onProcess` args/results to catch coupling between plugins.【F:extract/src/plugins/core/core.ts†L12-L58】【F:extract/src/plugins/po/po.ts†L13-L96】【F:extract/src/plugins/cleanup/cleanup.ts†L10-L62】
- **Pass B — extract shared logging utilities:** centralize structured logging (info/debug/warn) in `logger.ts` to avoid custom string messages and to attach context like entrypoint + locale consistently.【F:extract/src/plugins/po/po.ts†L41-L95】【F:extract/src/plugins/cleanup/cleanup.ts†L14-L62】
- **Pass C — decouple stateful collections:** move mutable maps/sets out of plugin setup closures into dedicated state managers that can be reused or reset per run, preventing memory leaks when multiple entrypoints execute sequentially.【F:extract/src/plugins/po/po.ts†L18-L95】【F:extract/src/plugins/cleanup/cleanup.ts†L15-L62】

## Project: `e2e`

### Area: Acceptance coverage for the toolchain

#### Purpose: ensure refactors preserve cross-package behaviour
- **Pass A — capture baseline scenarios:** write end-to-end scripts that run the extractor, loader, and React runtime together on a sample project to freeze generated `.po` output and runtime rendering.
- **Pass B — add regression matrix:** extend scenarios to cover async locale loading, pluralization edge cases, and cleanup plugin interactions, using snapshots that tolerate ordering but assert content.
- **Pass C — wire coverage to CI:** ensure `npm run test` (or a dedicated `npm run e2e`) executes in CI with coverage/trace logs so future refactors automatically validate invariants from BASE §3.

---

Each pass should remain behaviour-preserving while tightening tests, typings, and observability in line with the engineering principles defined in `docs/BASE.md`. Agents can tackle passes independently but must keep PRs scoped to a single purpose to maintain clarity and reversibility.
