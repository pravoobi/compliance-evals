import { describe, it, expect } from "vitest";
import { DeterministicGroundednessEvaluator } from "../evaluators/groundedness.js";
import {
  groundedSample,
  hallucatedSample,
  noContextSample,
} from "./fixtures/samples.js";

const evaluator = new DeterministicGroundednessEvaluator();

describe("DeterministicGroundednessEvaluator", () => {
  it("passes grounded output", async () => {
    const result = await evaluator.evaluate(groundedSample);
    expect(result.verdict).toBe("pass");
    expect(result.score).toBeGreaterThanOrEqual(0.4);
  });

  it("fails hallucinated output", async () => {
    const result = await evaluator.evaluate(hallucatedSample);
    expect(["fail", "warn"]).toContain(result.verdict);
  });

  it("warns when context is missing", async () => {
    const result = await evaluator.evaluate(noContextSample);
    expect(result.verdict).toBe("warn");
    expect(result.reasoning).toContain("No context provided");
  });

  it("includes coverage statement", async () => {
    const result = await evaluator.evaluate(groundedSample);
    expect(result.coverage).toContain("LLM-judge");
  });
});
