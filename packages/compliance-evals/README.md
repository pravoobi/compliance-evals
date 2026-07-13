# @compliance-evals/core

Compliance-native evaluators, append-only audit store, and evidence export for LLM applications in regulated domains.

> Provides evaluation evidence and audit trails. Not a legal compliance guarantee.

## Install

```bash
npm install @compliance-evals/core @compliance-evals/types
```

`@anthropic-ai/sdk` is an optional peer dependency — install it only if you want the LLM-backed groundedness judge.

## Evaluators

Both evaluators implement the common `Evaluator` interface:

```typescript
interface Evaluator {
  id: string;
  name: string;
  version: string;
  kind: "deterministic" | "llm-judge";
  frameworkTags: string[];
  evaluate(sample: Sample): Promise<EvalResult>;
}
```

### PII leakage

```typescript
import { PiiEvaluator } from "@compliance-evals/core";

const evaluator = new PiiEvaluator();
const result = await evaluator.evaluate(sample);

// result.verdict:  "pass" | "fail"
// result.spans:    [{ start, end, text, label, confidence }]
// result.coverage: explicit statement of what regex catches and doesn't
```

**Detects (regex + Luhn validation):** SSN, credit/debit card numbers, IBAN, US routing numbers, email addresses, US phone numbers.

**Does NOT detect:** personal names, postal addresses, free-form PII requiring NER. The `coverage` field in every result states this explicitly.

Tagged: `OWASP-LLM06`, `NIST-AI-RMF-GOVERN-1`

### Groundedness / faithfulness

```typescript
import { createGroundednessEvaluator } from "@compliance-evals/core";

// Returns DeterministicGroundednessEvaluator or AnthropicGroundednessEvaluator
// depending on whether ANTHROPIC_API_KEY is set in the environment.
const evaluator = createGroundednessEvaluator();
const result = await evaluator.evaluate(sample);

// result.verdict: "pass" | "fail" | "warn"
// result.score:   0.0–1.0
```

- **Default (no API key):** keyword overlap heuristic — zero config, zero cost. Rough proxy; use for development and CI.
- **LLM judge (`ANTHROPIC_API_KEY` set):** Claude Haiku evaluates faithfulness against retrieved context. More accurate, incurs API cost. Judge output stored in `result.judgeOutput` for alignment measurement.

You can also instantiate either directly:

```typescript
import {
  DeterministicGroundednessEvaluator,
  AnthropicGroundednessEvaluator,
} from "@compliance-evals/core";
```

Tagged: `OWASP-LLM09`, `NIST-AI-RMF-MAP-1`

## Audit store

Append-only, hash-chained audit records backed by SQLite. Each record hashes the previous one — modifying any record in the chain breaks verification.

```typescript
import { SqliteAuditStore, buildAuditRecord } from "@compliance-evals/core";

const store = new SqliteAuditStore("./audit.db");
store.initialize();

// Persist a sample and its eval result
store.upsertSample(sample);
store.upsertResult(result);

// Append a reviewer action
const record = buildAuditRecord({
  resultId: result.id,
  actor: "reviewer@example.com",
  action: "accepted",      // or "rejected" | "promoted_to_issue"
  reason: "Confirmed false positive.",
  prevHash: store.getLatestHash(),
});
store.append(record);

// Verify the chain has not been tampered with
const { valid, error } = store.verifyChain();
```

The `AuditStore` interface is narrow — swap in a different backend without changing call sites:

```typescript
interface AuditStore {
  initialize(): void;
  append(record: AuditRecord): void;
  getLatestHash(): string | null;
  verifyChain(): { valid: boolean; error?: string };
  listResults(sampleId?: string): EvalResult[];
  listAuditRecords(): AuditRecord[];
  upsertSample(sample: Sample): void;
  upsertResult(result: EvalResult): void;
  upsertIssue(issue: Issue): void;
  listSamples(): Sample[];
  listIssues(): Issue[];
}
```

## Evidence export

Build a signed, verifiable export of a review session for regulatory submission or offline audit.

```typescript
import { buildEvidenceBundle, signBundle, verifySignedExport } from "@compliance-evals/core";

const bundle = buildEvidenceBundle({
  results,
  auditRecords,
  issues,
  exporter: "reviewer@example.com",
});

const signed = await signBundle(bundle);
// signed.bundle     — the full evidence bundle
// signed.signature  — ED25519 signature (hex)
// signed.publicKey  — public key for offline verification (hex)

// Verify later
const { valid } = verifySignedExport(signed);
```

## Errors

```typescript
import { MissingCredentialsError, TamperDetectedError } from "@compliance-evals/core";
```

- `MissingCredentialsError` — thrown by `AnthropicGroundednessEvaluator` when `ANTHROPIC_API_KEY` is absent.
- `TamperDetectedError` — thrown by `verifyChain()` when a hash mismatch is detected.

## Regulatory framework tags

Evaluators expose `frameworkTags` (`OWASP-LLM06`, `NIST-AI-RMF-MAP-1`, etc.) as navigational aids. Verify current framework requirements at your build time — these evolve. No compliance guarantee is expressed or implied.

## License

MIT
