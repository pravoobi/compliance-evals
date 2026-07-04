import { describe, it, expect } from "vitest";
import { PiiEvaluator } from "../evaluators/pii.js";
import {
  cleanSample,
  piiLeakSample,
  ibanLeakSample,
  noContextSample,
} from "./fixtures/samples.js";

const evaluator = new PiiEvaluator();

describe("PiiEvaluator", () => {
  it("passes clean output", async () => {
    const result = await evaluator.evaluate(cleanSample);
    expect(result.verdict).toBe("pass");
    expect(result.spans).toBeUndefined();
    expect(result.score).toBe(1);
  });

  it("fails output with SSN, credit card, email, phone", async () => {
    const result = await evaluator.evaluate(piiLeakSample);
    expect(result.verdict).toBe("fail");
    expect(result.spans?.length).toBeGreaterThan(0);
    const labels = result.spans!.map((s) => s.label);
    expect(labels).toContain("SSN");
    expect(labels).toContain("CREDIT_CARD");
    expect(labels).toContain("EMAIL");
    expect(labels).toContain("US_PHONE");
    expect(result.severity).toBe("critical");
  });

  it("detects IBAN and routing number", async () => {
    const result = await evaluator.evaluate(ibanLeakSample);
    expect(result.verdict).toBe("fail");
    const labels = result.spans!.map((s) => s.label);
    expect(labels).toContain("IBAN");
    expect(labels).toContain("US_ROUTING_NUMBER");
  });

  it("passes sample with no output PII (only has input)", async () => {
    const result = await evaluator.evaluate(noContextSample);
    expect(result.verdict).toBe("pass");
  });

  it("includes coverage statement in every result", async () => {
    const result = await evaluator.evaluate(cleanSample);
    expect(result.coverage).toBeDefined();
    expect(result.coverage).toContain("Does NOT detect personal names");
  });

  it("detects standard test card 4111111111111111 (Luhn-valid)", async () => {
    const sample = {
      ...cleanSample,
      output: "Your card ending in 4111111111111111 has been processed.",
    };
    const result = await evaluator.evaluate(sample);
    expect(result.verdict).toBe("fail");
    const labels = result.spans!.map((s) => s.label);
    expect(labels).toContain("CREDIT_CARD");
  });

  it("rejects Luhn-invalid card numbers", async () => {
    const sample = {
      ...cleanSample,
      output: "The card number 4111111111111112 was rejected.",
    };
    const result = await evaluator.evaluate(sample);
    expect(result.verdict).toBe("pass");
  });
});
