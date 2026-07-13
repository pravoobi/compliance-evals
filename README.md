# compliance-evals

An evaluation layer for LLM applications in regulated domains (fintech first), with a triage UI built for human reviewers — not as an afterthought.

Two parts, one repo:

- **`@compliance-evals/core`** — evaluators, audit records, and evidence export for regulated LLM apps.
- **`triage-ui`** — keyboard-first human review, failure triage, and annotation interface.

> **What this provides:** evaluation evidence and audit trails. It is not a legal compliance guarantee. Language in outputs and docs is intentionally accurate about that distinction.

---

## Packages

| Package | Description | Published |
|---|---|---|
| [`@compliance-evals/types`](./packages/types) | Shared data model (Zod schemas) | npm |
| [`@compliance-evals/core`](./packages/compliance-evals) | Evaluators, audit store, evidence export | npm |
| `triage-ui` | Next.js review application | self-hosted |

---

## Getting started

**Prerequisites:** Node >= 20, pnpm >= 9

```bash
git clone https://github.com/your-org/compliance-evals
cd compliance-evals
pnpm install
pnpm build
```

### Run the triage UI

```bash
pnpm dev
```

Opens at [http://localhost:3000](http://localhost:3000). On first load, click **Seed** to load the 30 synthetic sample interactions and run all evaluators.

### Run with Docker

```bash
docker build -t compliance-evals ./packages/triage-ui
docker run -p 3000:3000 compliance-evals
```

### Enable the LLM groundedness judge

The groundedness evaluator defaults to a deterministic keyword-overlap heuristic (zero config, zero cost). To activate the LLM-backed judge:

```bash
ANTHROPIC_API_KEY=sk-ant-... pnpm dev
```

---

## Using the libraries

```bash
npm install @compliance-evals/core @compliance-evals/types
```

### Run evaluators

```typescript
import { PiiEvaluator, createGroundednessEvaluator } from "@compliance-evals/core";
import type { Sample } from "@compliance-evals/types";

const sample: Sample = {
  id: "s-001",
  input: "What is my account balance?",
  output: "Your SSN is 123-45-6789 and balance is $1,200.",
  createdAt: new Date(),
};

const pii = new PiiEvaluator();
const result = await pii.evaluate(sample);

console.log(result.verdict);   // "fail"
console.log(result.spans);     // [{ label: "SSN", start: 14, end: 25, ... }]
console.log(result.coverage);  // honest statement of what regex catches and doesn't
```

### Audit store + hash chain

```typescript
import { SqliteAuditStore, buildAuditRecord } from "@compliance-evals/core";

const store = new SqliteAuditStore("./audit.db");
store.initialize();

// Append a review action — each record hashes the previous one
const record = buildAuditRecord({
  resultId: result.id,
  actor: "reviewer@example.com",
  action: "accepted",
  reason: "False positive — test identifier in fixture data.",
  prevHash: store.getLatestHash(),
});
store.append(record);

// Detect tampering
const { valid, error } = store.verifyChain();
```

### Evidence export

```typescript
import { buildEvidenceBundle, signBundle } from "@compliance-evals/core";

const bundle = buildEvidenceBundle({ results, auditRecords, issues, exporter: "reviewer" });
const signed = await signBundle(bundle);
// signed.signature, signed.publicKey — verifiable offline
```

---

## Project structure

```
compliance-evals/
├── packages/
│   ├── types/           # @compliance-evals/types — Zod schemas for all data types
│   ├── compliance-evals/# @compliance-evals/core — evaluators, store, export
│   ├── ui/              # internal component library (Radix + TailwindCSS)
│   └── triage-ui/       # Next.js app — self-hosted review interface
├── turbo.json
└── pnpm-workspace.yaml
```

Build order is enforced by Turborepo: `types` → `compliance-evals` → `ui` → `triage-ui`.

---

## Testing

```bash
pnpm test
```

Tests cover:
- PII pattern detection and Luhn validation (`pii.test.ts`)
- Groundedness scoring for grounded and hallucinated outputs (`groundedness.test.ts`)
- Hash-chain tamper detection — modifying any record breaks verification (`audit-chain.test.ts`)

---

## Evaluator coverage and honest limitations

### PII leakage (`PiiEvaluator`)

Regex-based detection. Reliably catches **structured identifiers**: SSN, credit/debit card numbers (Luhn-validated), IBAN, US routing numbers, email addresses, US phone numbers.

**Does NOT detect:** personal names, postal addresses, or free-form PII requiring NER. The coverage statement is included in every `EvalResult.coverage` field so reviewers always know what was and wasn't checked.

### Groundedness (`createGroundednessEvaluator`)

- **Default (no API key):** keyword overlap heuristic — fast, zero-cost, rough proxy. False negatives on paraphrase, false positives on coincidental overlap. Use for development and CI gating.
- **LLM judge (with `ANTHROPIC_API_KEY`):** Claude Haiku evaluates faithfulness against retrieved context. More accurate, incurs API cost.

Both implement the same `Evaluator` interface and are swappable.

---

## Regulatory framework references

Evaluators are tagged with framework identifiers (`OWASP-LLM06`, `NIST-AI-RMF-MAP-1`, etc.) as navigational aids. These tags reflect framework categories at the time of writing. **Verify current requirements at your build time** — these frameworks evolve, and this file may be stale. No compliance guarantee is expressed or implied.

---

## Non-goals (v1)

- Generic prompt playground or model comparison UI
- Trace ingestion pipeline (consume OTel/OpenInference spans from an existing tool instead)
- Cost/token/latency dashboards
- Broad framework connectors (LangChain, LlamaIndex, etc.)

---

## License

MIT
