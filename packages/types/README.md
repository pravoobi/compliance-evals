# @compliance-evals/types

Shared data model for compliance-evals. Zod schemas and TypeScript types for `Sample`, `EvalResult`, `AuditRecord`, and `Issue`.

## Install

```bash
npm install @compliance-evals/types
```

## Types

### `Sample`

An LLM interaction to be evaluated.

```typescript
import type { Sample } from "@compliance-evals/types";

const sample: Sample = {
  id: "s-001",
  threadId: "thread-abc",     // optional — multi-turn thread grouping
  turnIndex: 0,               // optional — position within thread
  input: "What is my balance?",
  context: "Account balance: $1,200.",  // optional — RAG context
  output: "Your balance is $1,200.",
  toolCalls: [],              // optional — agentic tool calls
  metadata: { model: "claude-sonnet-4-6" },  // optional
  createdAt: new Date(),
};
```

### `EvalResult`

Output from an evaluator run against a sample.

```typescript
import type { EvalResult } from "@compliance-evals/types";

// result.verdict:          "pass" | "fail" | "warn"
// result.score:            0.0–1.0 (optional — not all evaluators produce a score)
// result.severity:         "critical" | "high" | "medium" | "low" (optional)
// result.spans:            detected spans in the output (see EvalSpan)
// result.reasoning:        human-readable explanation
// result.coverage:         honest statement of evaluator's detection coverage
// result.judgeOutput:      raw LLM judge output, if kind === "llm-judge"
// result.evidenceRef:      SHA-256 hash of the input (provenance anchor)
```

### `EvalSpan`

A detected region within an output, with location and label.

```typescript
import type { EvalSpan } from "@compliance-evals/types";

// span.start:      character offset (inclusive)
// span.end:        character offset (exclusive)
// span.text:       matched text
// span.label:      e.g. "SSN" | "CREDIT_CARD" | "EMAIL"
// span.confidence: 0.0–1.0
```

### `AuditRecord`

An append-only, hash-chained record of a reviewer action.

```typescript
import type { AuditRecord } from "@compliance-evals/types";

// record.id:        UUID
// record.prevHash:  hash of the preceding record (or "GENESIS" for the first)
// record.hash:      SHA-256(prevHash + resultId + actor + action + createdAt)
// record.resultId:  the EvalResult this action applies to
// record.actor:     reviewer identifier
// record.action:    "accepted" | "rejected" | "promoted_to_issue"
// record.reason:    optional free-text note
// record.createdAt: ISO timestamp
```

### `Issue`

A tracked failure promoted from a flagged sample, usable as a regression criterion.

```typescript
import type { Issue } from "@compliance-evals/types";

// issue.id:          UUID
// issue.title:       short description
// issue.status:      "open" | "triaged" | "resolved" | "regressed"
// issue.sampleIds:   samples that exhibit this failure
// issue.evalCriteria: which evaluator(s) surfaced the issue
// issue.createdAt, issue.updatedAt
```

## Zod schemas

All types have corresponding Zod schemas for runtime validation:

```typescript
import { SampleSchema, EvalResultSchema, AuditRecordSchema, IssueSchema } from "@compliance-evals/types";

const parsed = SampleSchema.parse(rawInput);
```

## License

MIT
