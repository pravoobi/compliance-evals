import type { EvalResult, Sample } from "@compliance-evals/types";

export interface Evaluator {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly kind: "deterministic" | "llm-judge";
  readonly frameworkTags: readonly string[];
  evaluate(sample: Sample): Promise<EvalResult>;
}
