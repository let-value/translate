# Engineering Principles for Agents

---

## 0) Purpose & Scope

This document tells coding agents **what “good” looks like** regardless of language or framework. It favors clarity, safety, and verifiability over cleverness. Every rule here is meant to be testable, automatable, or reviewable.

---

## 1) First Principles (Stoic Maxims)

* **Clarity > Cleverness.** Choose the simplest design that meets the requirement with room to evolve.
* **Small, reversible steps.** Prefer incremental PRs; keep blast radius low.
* **Make illegal states unrepresentable.** Enforce invariants at boundaries; validate inputs early.
* **One source of truth.** Avoid duplicated logic and copy‑pasted schemas.
* **Fail fast near the source; handle errors once.** Bubble up rich, typed errors; centralize mapping to user‑facing messages/status.
* **Determinism by default.** Seed randomness, freeze clocks in tests, remove hidden global state.
* **Idempotence for effects.** Retrying must not corrupt data or duplicate work.
* **Backwards compatibility by default.** Additive changes first; deprecate with a timeline.
* **Least privilege, least surprise.** Secure defaults; obvious behavior.
* **Measure before optimizing.** Define budgets (latency, memory, cost) and verify with telemetry.
* **Delete fearlessly, with safety nets.** Tests + feature flags + rollbacks.
* **Leave the campsite cleaner.** Boy‑scout rule: improve nearby code when touched.

---

## 2) Definition of Done (DOD) — Checklist

A change is **not done** until all of these hold:

1. **Build & Static Checks:** compiles; format/lint/type checks pass; no new warnings.
2. **Tests:** unit + integration (and E2E if a user flow changes). **Bugs require a failing test first.**
3. **Coverage:** changed files meet project gates (suggested: ≥85% lines, ≥80% branches) unless justified in the PR.
4. **Observability:** structured logs, metrics, and (if applicable) traces added for new paths; include correlation IDs; redact sensitive data.
5. **Security:** inputs validated; authZ/authN enforced; secrets not in code; dependencies vetted; threat sketch in PR if touching trust boundaries.
6. **Resilience:** timeouts, retries with jitter, backoff caps, and circuit breakers where network/IO exists; graceful shutdown tested.
7. **Performance:** stay within stated budgets; no N+1; memory and concurrency characteristics noted when non‑trivial.
8. **Data & Migrations:** schema changes are backward compatible; migrations are idempotent and reversible; backfill/rollout plan documented.
9. **Docs:** updated README/API docs; change note in CHANGELOG; brief ADR if a notable decision.
10. **Operations:** feature flags/config documented; rollback plan exists; SLO/alert impact considered.

---

## 3) Testing Standard

**Intent:** Prove behavior, prevent regressions, and document design.

* **Pyramid, not ice‑cream.** Many fast unit tests; fewer integration; a handful of E2E.
* **Arrange‑Act‑Assert** structure; tests read like examples; one behavior per test.
* **Deterministic by construction:** no sleeps; use virtual clocks/fake timers; stub randomness; control IO.
* **Boundaries over internals:** test through public contracts. Favor fakes over heavy mocks; avoid asserting implementation details.
* **Property‑based tests** for invariants; **snapshot tests** only for stable, reviewed formats (treat as contracts).
* **Test data builders** hide setup noise; fixtures are minimal and local.
* **Flakes:** label, quarantine with owner + ticket, and fix within the agreed SLO.

---

## 4) Design & Architecture

* **Modularity:** small components with clear interfaces; single responsibility; no god objects.
* **Explicit boundaries:** domain vs. infrastructure; side effects isolated; dependency direction is intentional.
* **Error taxonomy:** distinguish *expected/recoverable* vs *unexpected/fatal*; map to well‑defined status codes.
* **Concurrency:** avoid shared mutable state; prefer immutability, queues, and idempotency keys; document ordering guarantees.
* **APIs:** stable, documented contracts; semantic versioning for libraries; deprecation paths for services.
* **Configuration:** 12‑factor style; no secrets in code; repeatable environments; config validation at startup.
* **Data:** migrations are tested; indexes planned; retention and privacy requirements stated; backups/restore drills considered.
* **Caching:** define ownership, TTL, invalidation, and stampede protection; cache misses must still meet SLO.

---

## 5) Security & Privacy (Always‑On)

* **Trust boundaries:** validate/normalize at every ingress; encode/escape at egress.
* **Least privilege:** scoped tokens, per‑service identities, minimal permissions; rotate and audit.
* **Supply chain:** pin dependencies; generate SBOM; verify integrity/provenance; monitor for CVEs.
* **Secrets management:** dedicated vault/KMS; no secrets in logs, crashes, or tests.
* **PII:** classify; minimize collection; encrypt in transit/at rest; document lawful purpose and retention.
* **Secure logging:** redact sensitive fields; include who/what/when; never log credentials or full tokens.

---

## 6) Observability & Operations

* **Structured logs** with event names and fields; attach correlation/request IDs end‑to‑end.
* **Metrics:** cover RED (Rate, Errors, Duration) for user‑facing work and USE (Utilization, Saturation, Errors) for resources.
* **Tracing:** span new boundaries; record critical attributes and error causes.
* **Health checks:** liveness vs readiness; fail closed.
* **SLOs & Alerts:** alerts are actionable, routed, and deduplicated; document runbooks.
* **Feature flags:** gated rollouts; kill switches for risky paths.

---

## 7) Style & Documentation

* **Names signal intent.** Prefer nouns for data, verbs for actions; avoid abbreviations.
* **Comments explain “why,” not “what.”** Keep them near the code; delete stale comments.
* **Public APIs are documented** with concise examples; keep examples tested when possible.
* **Lightweight ADRs** capture *context → options → decision → consequences*. Keep to one screen.

---

\$1

### 8.1 Phased Execution: **Solve → Harden → Polish**

**Why:** Agents should focus on the right work at the right time. Use phases to control scope and prevent premature polishing.

**Phase 0 — Clarify & Plan (time‑box):**

* Confirm the *user outcome*, acceptance criteria, and constraints.
* Note unknowns/risks and a rollback plan. Create/append a tiny ADR if non‑trivial.

**Phase 1 — SOLVE (Critical Path)**

* Deliver the minimal, correct behavior **behind a flag** or on a short‑lived branch.
* Obligations now: compiles; static checks pass; core **unit tests** for the changed behavior; basic structured logs. Keep changes local and reversible.
* Defer until HARDEN: cross‑service wiring, heavy integration/E2E, broad refactors, performance tuning.
* **Exit criteria:** acceptance tests for the happy path pass; PR is < \~300 lines effective diff; reviewer can grok it in ≤30 minutes.

**Phase 2 — HARDEN (Make it safe to ship)**

* Apply the full **Definition of Done**: integration/E2E where user flow changed, coverage gates on changed files, observability (logs/metrics/traces), performance budgets, security checks, migrations tested, docs updated.
* Stabilize flakiness; remove temporary flags or set safe defaults.

**Phase 3 — POLISH (Cleanup & debt)**

* Behavior‑preserving refactors, naming, dead‑code removal, module boundaries, error taxonomy, comments that explain "why".
* Tag PRs as **refactor‑only**; prove equivalence with unchanged E2E/public API and stable metrics.

**Time guidance:** prioritize SOLVE within the sprint/day; HARDEN before merge to main or feature exposure; POLISH as fast follow but never skipped when risk remains.

### 8.2 Refactoring Playbook (Behavior‑Preserving)

**Intent:** Improve structure, readability, and safety **without changing observable behavior**.

1. **Baseline & Safety Net**

* Run the full test suite; add missing tests around the affected public behavior. Capture a coverage and performance snapshot; create a small golden sample if applicable.

2. **Define Scope & Invariants**

* State what must not change (APIs, schemas, user‑visible output). List explicit invariants (e.g., idempotency, ordering, latency budget).

3. **Plan Micro‑Steps**

* Prefer mechanical transformations: *rename → extract → move → isolate side‑effects → invert dependency → deduplicate → strengthen types*.
* One transformation per commit; keep the code compiling and tests green at every step.

4. **Execute with Guardrails**

* Use test data builders; fake timers; avoid global state. Enforce changed‑file coverage gates. Keep PRs small and reviewable.

5. **Prove Equivalence**

* E2E results unchanged; public API signatures/semantics unchanged; logs/metrics within agreed tolerances; no new warnings.

6. **Finish & Document**

* Update docs/ADRs to reflect new boundaries/names. Remove deprecated paths and temporary shims.

**Common Smells (triage list):** long function, duplicate code, primitive obsession, large class/module, temporal coupling, boolean parameters, broad catch, null/undefined drift, shotgun surgery, shared mutable globals.

**Risk Map:**

* *Low:* rename/extract/move within module → fast path, minimal review.
* *Medium:* boundary changes, dependency inversion → require ADR + integration tests.
* *High:* data/schema or concurrency semantics → require migration plan, back‑compat strategy, and rollback validation.

**Automation hooks (map to your tooling):** `verify` (format/lint/type/test/coverage), secret scan, dep audit/SBOM, dead‑code check, duplicate‑code detector.

---

## 9) Anti‑Patterns to Avoid

* Over‑engineering without a user need (violates YAGNI); tight coupling across layers; shared mutable global state.
* Silent failures; broad catch‑alls; swallowing errors.
* Reliance on manual steps; undocumented magic; hidden side effects.
* Sleep‑based tests; excessive mocking; testing only through private internals.
* Unpinned dependencies; committing secrets; ignoring licensing/compliance.

---

## 10) Governance

* **Violations** block merges unless explicitly waived in the PR with justification.
* **Changes to this base** require an ADR and a two‑reviewer approval.
* **Automation first:** encode these rules in CI as gates, not suggestions.
