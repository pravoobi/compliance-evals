import { z } from "zod";

export const VerdictSchema = z.enum(["pass", "fail", "warn"]);

export const SeveritySchema = z.enum([
  "critical",
  "high",
  "medium",
  "low",
  "info",
]);

export const EvalSpanSchema = z.object({
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
  text: z.string(),
  label: z.string(),
  confidence: z.number().min(0).max(1).optional(),
});

export const EvaluatorKindSchema = z.enum(["deterministic", "llm-judge"]);

export const EvaluatorRefSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  kind: EvaluatorKindSchema,
  frameworkTags: z.array(z.string()),
});

export const EvalResultSchema = z.object({
  id: z.string().uuid(),
  sampleId: z.string().uuid(),
  evaluatorId: z.string(),
  evaluatorVersion: z.string(),
  verdict: VerdictSchema,
  score: z.number().min(0).max(1).optional(),
  severity: SeveritySchema.optional(),
  spans: z.array(EvalSpanSchema).optional(),
  reasoning: z.string(),
  coverage: z.string().optional(),
  evidenceRef: z.string().optional(),
  judgeOutput: z.string().optional(),
  createdAt: z.coerce.date(),
});

export type Verdict = z.infer<typeof VerdictSchema>;
export type Severity = z.infer<typeof SeveritySchema>;
export type EvalSpan = z.infer<typeof EvalSpanSchema>;
export type EvaluatorKind = z.infer<typeof EvaluatorKindSchema>;
export type EvaluatorRef = z.infer<typeof EvaluatorRefSchema>;
export type EvalResult = z.infer<typeof EvalResultSchema>;
