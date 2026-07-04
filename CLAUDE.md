# CLAUDE.md

Context for AI coding agents working on this project. Read this fully before writing code.

---

## What this is

An **evaluation layer for LLM applications in regulated domains** (fintech first), with a
**best-in-class triage UI** as a co-equal deliverable — not an afterthought.

Two parts, one repo:

1. **`compliance-evals`** — a library of evaluators + an audit/evidence model for regulated LLM apps.
2. **`triage-ui`** — the human-review, failure-triage, and annotation interface that most existing tools do badly.

The bet: generic LLM observability is a red ocean. The wedge is (a) compliance-native evaluation that
incumbents treat as an enterprise upsell, and (b) UX quality in a category built by backend-first teams.

---

## Read this before scoping anything: competitive reality

Do **not** rebuild a general-purpose observability platform. That space is saturated as of 2026:
Langfuse (acquired by ClickHouse, Jan 2026), Braintrust, LangSmith, Arize/Phoenix, Latitude,
Confident AI, Helicone, Portkey, plus Datadog/New Relic LLM modules.

We will **lose** any head-to-head on: trace ingestion volume, generic prompt playgrounds,
framework-integration breadth, cost/latency dashboards. **Do not build these.** If we need tracing,
we ingest from an existing tool (OpenTelemetry / OpenInference spans) rather than reinventing it.

We **win** only on two things the field is weak at:
- **Compliance-shaped evaluation** — PII leakage, advice-boundary violations, auditability, regulatory evidence export. Most tools bolt this on; we treat it as the product.
- **Triage/annotation UX** — the recurring complaint across every incumbent review is "dashboards full of data teams can't act on." That gap is the opening.

Everything in this file should be judged against: *does it deepen one of those two moats?* If not, cut it.

---

## Part 1 — `compliance-evals` (the library)

### Purpose
Given an LLM interaction (input, retrieved context, output, optional tool calls / multi-turn thread),
produce **evaluation results** *and* **audit evidence** suitable for a regulated environment.

### Evaluator categories (v1 priorities in order)
1. **PII / sensitive-data leakage** — detect PII or sensitive financial identifiers in outputs (and in prompts logged downstream). Detection + severity + span-level location.
2. **Advice-boundary checks** — flag output that reads as regulated financial/legal advice when the app is not licensed to give it. This is domain-specific and rule-configurable; do not hardcode one jurisdiction's rules.
3. **Groundedness / faithfulness** — is the output supported by retrieved context (RAG hallucination check). Reuse an existing OSS metric library here rather than inventing metrics — wrap, don't rebuild.
4. **Safety / toxicity / bias** — standard, but retained because compliance reviewers expect it.
5. **Tool-selection / planning correctness** — only if the target app is agentic. Defer if not.

### Architecture principles
- **Evaluators are pluggable and composable.** A common `Evaluator` interface: `(sample) => EvalResult`. Deterministic evaluators (regex/classifier/PII models) and LLM-as-judge evaluators implement the same interface.
- **Every LLM-as-judge evaluator is itself measurable.** Store judge outputs so we can later check judge↔human alignment (see "meta-eval" under Future). This is a differentiator; design the data model to allow it from day one even if the UI comes later.
- **Evidence, not just scores.** Each `EvalResult` carries: the verdict, the reasoning, the input hash, the evaluator version, a timestamp, and enough to reconstruct *why* a decision was made months later. Regulated review needs provenance, not a number.
- **Tamper-evidence.** Audit records should be append-only and hash-chained (each record references the prior record's hash). Do not overengineer into a blockchain — a simple hash chain + signed export is enough for v1.
- **Regulatory frameworks are references, not gospel.** OWASP Top 10 for LLM Apps, NIST AI RMF, and the EU AI Act are the frameworks reviewers cite. Map evaluators to these where honest, but **verify current requirements at build time** — these evolve, and this file may be stale. Never fabricate a compliance guarantee in code comments or output.

### Data model (directional)
```
Sample        { id, threadId?, turnIndex?, input, context?, output, toolCalls?, metadata, createdAt }
Evaluator     { id, name, version, kind: 'deterministic'|'llm-judge', frameworkTags[] }
EvalResult    { id, sampleId, evaluatorId, evaluatorVersion, verdict, score?, severity?,
                spans?[], reasoning, evidenceRef, createdAt }
AuditRecord   { id, prevHash, hash, resultId, actor, action, createdAt }  // append-only, hash-chained
Issue         { id, title, status: 'open'|'triaged'|'resolved'|'regressed', sampleIds[], evalCriteria }
```
`Issue` is the bridge to Part 2 and to regression testing — a triaged production failure becomes a
tracked issue whose criteria can be promoted into the regression suite.

---

## Part 2 — `triage-ui` (the interface)

### Purpose
The place a human (engineer, QA, compliance reviewer) reviews flagged interactions, annotates them,
turns failures into tracked issues, and signs off. This is where we out-execute incumbents.

### What it must do well (in priority order)
1. **Fast triage of flagged samples** — keyboard-first, low-latency, high-density-but-readable. Reviewing 200 flagged traces should not feel like fighting the UI.
2. **Span-level highlighting** — show *where* in the output the PII/advice/hallucination was detected, inline, not in a side panel you have to correlate manually.
3. **Failure → issue in one action** — promote a bad sample to a tracked `Issue` and (later) into the regression suite without leaving the review flow.
4. **Reviewer sign-off with audit trail** — who approved/rejected what, when, why. Writes an `AuditRecord`.
5. **Cross-functional access** — a compliance reviewer who can't code must be able to run a full review cycle. No CLI required for the review loop.

### UX bar (non-negotiable — this is the moat)
- **Accessibility: WCAG 2.1 AA, real.** Keyboard-navigable end to end, screen-reader tested (VoiceOver + keyboard pass before shipping any review flow). This is both a differentiator and on-brand for a compliance product.
- Density without clutter. Trace exploration is the thing every competitor gets wrong; treat information hierarchy as a first-class design problem.
- Optimistic, instant-feeling interactions. Never block the reviewer on a network round-trip for annotation.

---

## Smallest honest v1

Ship this before anything clever:
- `compliance-evals` with **two** evaluators working end to end: **PII-leakage** (deterministic + optional model) and **groundedness** (wrap an existing OSS metric). Nothing else.
- `EvalResult` + append-only hash-chained `AuditRecord` persisted.
- `triage-ui` that: lists flagged samples, shows span-level highlights, lets a reviewer accept/reject with a reason (writes an audit record), and promotes a sample to an `Issue`.
- One signed evidence-export (JSON) of a review session.

If that works and feels good to use, the moat is real. Everything below is later.

---

## Tech stack & conventions

- **Language:** TypeScript throughout, strict mode. No `any` without a written reason.
- **UI:** React + Next.js. Follow existing `@practics/ui` patterns/components where they fit (Radix UI, TanStack Table for dense data, Vitest for tests). Reuse before building new.
- **Library packaging:** publishable npm package(s), same discipline as prior packages (typed exports, tested public API, semver).
- **Testing:** Vitest. Evaluators need unit tests with fixture samples; the audit hash-chain needs tests proving tamper-detection works.
- **Ingestion:** consume OpenTelemetry / OpenInference spans rather than building bespoke tracing. Don't reinvent the trace layer.
- **Monorepo:** packages `compliance-evals` (core) and `triage-ui` (app), plus a shared `types` package for the data model.

---

## Explicit non-goals

- ❌ Generic prompt playground / model comparison UI.
- ❌ Trace ingestion pipeline built from scratch.
- ❌ Cost/token/latency dashboards.
- ❌ Broad framework-integration matrix (LangChain/LlamaIndex/etc. connectors) — not our fight.
- ❌ Blockchain anything. Hash chain is sufficient.
- ❌ Fabricated compliance guarantees. We provide *evidence and checks*, not legal assurance. Language in code, docs, and output must stay accurate about that.

---

## Future upgrades (backlog — pick up later via Claude Code)

- **Meta-evaluation:** measure LLM-judge alignment against human annotations; detect judge drift over time. (Data model already supports storing judge outputs — build the measurement + UI.)
- **Auto-curation:** cluster production failures, surface recurring patterns, suggest which failures belong in the regression suite. This is the "issue discovery is manual everywhere" gap.
- **Regression gate:** wire promoted `Issue` criteria into a CI check that fails a PR on regression.
- **Online evals:** run a sampled subset of evaluators on live production traffic with quality/drift alerting.
- **Multi-turn / agent evals:** conversation-level metrics (coherence, context retention, tool-error propagation across steps) once single-turn is solid.
- **Additional jurisdictions / frameworks:** expand advice-boundary and evidence-export mappings — **re-verify current regulatory requirements each time; do not trust this file's framework references as current.**
- **Red-teaming module:** adversarial test generation aligned to OWASP LLM Top 10.

---

## Notes for the agent

- When in doubt, ask: does this deepen the compliance moat or the UX moat? If neither, don't build it.
- Prefer wrapping mature OSS (metrics, PII detection models) over reinventing. Our value is the compliance framing, evidence model, and UX — not novel metrics.
- Anything touching regulatory claims: flag for human verification, never assert compliance in output text.
- Keep the review loop keyboard-first and accessible; that's a product requirement, not polish.

---

## Locked decisions (v1) — build for product seed

These answer the scaffolding agent's blocking + nice-to-have questions. Product-seed framing:
build an independent, self-hostable product with clean confidentiality posture. Follow these;
if you deviate, record why.

1. **Monorepo:** pnpm workspaces + Turborepo. Minimal config. Task pipeline expresses build order: `types` → `compliance-evals` → `triage-ui`. Not Nx (too heavy).

2. **Design system:** do **NOT** install `@practics/ui`. This is a standalone product and must not depend on a personal design-system package. Create an internal `packages/ui` for shared primitives (dense table, annotation surfaces) on Radix + TanStack Table. Vendor-neutral, no external registry/auth coupling. *(This reverses the CLAUDE.md "reuse @practics/ui" note above — product-seed overrides it.)*

3. **Groundedness:** ship both behind one interface. Deterministic stub is the **default** (zero-config, zero-cost). Optional Anthropic-API-backed LLM-judge activates only when an API key is present. The v1 requirement is that deterministic and LLM-judge implement the same `Evaluator` interface — prove that; the real judge is an opt-in path.

4. **Persistence:** SQLite via `better-sqlite3` for v1, behind a narrow `AuditStore` interface. Pluggable at the interface level from day one, but implement **only** SQLite now. Postgres/Drizzle is a later second implementation, not a rewrite. `better-sqlite3` is a native module → the UI touches it only through server-side routes/actions, never an edge runtime.

5. **PII:** deterministic-only for v1 with a documented extension point. Stub the Presidio (Python) path as a documented interface; do **not** implement it (no Python runtime in the repo). The evaluator MUST state its coverage boundary honestly: regex reliably catches structured identifiers (SSN, cards, IBAN, routing, email, phone) but NOT names or free-form addresses (those need NER). Surface this limitation in output and docs. The honesty is the compliance differentiator, not a gap to hide.

6. **Trace ingestion:** SDK/JSON only for v1. OTel/OpenInference ingestion deferred. Documented non-goal.

7. **Sample data:** synthetic only, fixed seed. **No real or "redacted" data, ever.** Use well-known test identifiers (test card `4111 1111 1111 1111`, documented test IBANs) so nothing resembles production data. Hand-craft the 30 samples so each evaluator has clean / PII-leak / hallucination / advice-boundary cases — the smoke test doubles as the demo script.

8. **Deployment:** localhost (`pnpm dev`) for v1, plus a Dockerfile as a small addition. Self-hostable / VPC-deployable is part of the value prop for regulated buyers, so bake the container path in early. For a clickable demo, target a long-running container host (Railway / Fly / Render), **NOT** Vercel — `better-sqlite3` won't run serverless.

9. **License & publish:** MIT. Publish `types` and `compliance-evals`; keep `triage-ui` as a deployable app (not published). Make libraries publish-*ready* at v1 (typed exports, tested public API, honest semver), publish only after the smoke test passes and the API is stable. Open-core note: MIT is right for adoption, but if a commercial-hosted tier comes later, an open-core split (permissive core, separate license on advanced/enterprise features) is the common path — don't decide now, don't foreclose it.

### Product-seed guardrails (apply throughout)
- **Vendor-neutral everywhere.** No Marcus / Goldman / employer references in code, comments, samples, README, or commit history. Protects confidentiality and keeps the product credibly general.
- **Record the why.** As decisions get made or revised during the build, append them here with rationale so the next session inherits reasoning, not just outcomes.
