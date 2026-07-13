import { describe, it, expect } from "vitest";
import { randomUUID } from "crypto";
import type { AuditStore } from "../store/audit-store.js";
import type { Issue, Sample } from "@compliance-evals/types";
import { PiiEvaluator } from "../evaluators/pii.js";
import { DeterministicAdviceBoundaryEvaluator } from "../evaluators/advice-boundary.js";
import { RegressionRunner } from "../regression/runner.js";

const now = new Date("2024-01-15T10:00:00Z");

function makeStore(issues: Issue[], samples: Sample[]): AuditStore {
  const sampleMap = new Map(samples.map((s) => [s.id, s]));
  return {
    listIssues: () => issues,
    getSample: (id) => sampleMap.get(id),
  } as unknown as AuditStore;
}

function makeSample(output: string, id = randomUUID()): Sample {
  return { id, input: "test input", output, createdAt: now };
}

function makeIssue(
  status: Issue["status"],
  sampleIds: string[],
  evaluatorId = "pii-leakage-v1"
): Issue {
  return {
    id: randomUUID(),
    title: `Test issue (${status})`,
    status,
    sampleIds,
    evalCriteria: [{ evaluatorId, verdict: "fail", description: "test criterion" }],
    createdAt: now,
    updatedAt: now,
  };
}

describe("RegressionRunner", () => {
  const pii = new PiiEvaluator();
  const advice = new DeterministicAdviceBoundaryEvaluator();

  it("passes with no issues", async () => {
    const runner = new RegressionRunner([pii]);
    const report = await runner.run(makeStore([], []));
    expect(report.passed).toBe(true);
    expect(report.regressions).toBe(0);
    expect(report.totalIssues).toBe(0);
  });

  it("marks resolved issue as regressed when sample still fails", async () => {
    const sample = makeSample("Your SSN is 123-45-6789.");
    const issue = makeIssue("resolved", [sample.id]);
    const runner = new RegressionRunner([pii]);
    const report = await runner.run(makeStore([issue], [sample]));

    expect(report.passed).toBe(false);
    expect(report.regressions).toBe(1);
    expect(report.results[0]?.outcome).toBe("regressed");
  });

  it("passes when resolved issue sample now passes evaluation", async () => {
    const sample = makeSample("No sensitive information here.");
    const issue = makeIssue("resolved", [sample.id]);
    const runner = new RegressionRunner([pii]);
    const report = await runner.run(makeStore([issue], [sample]));

    expect(report.passed).toBe(true);
    expect(report.regressions).toBe(0);
    expect(report.results[0]?.outcome).toBe("pass");
  });

  it("marks open issue as still-failing without failing the gate", async () => {
    const sample = makeSample("Your SSN is 123-45-6789.");
    const issue = makeIssue("open", [sample.id]);
    const runner = new RegressionRunner([pii]);
    const report = await runner.run(makeStore([issue], [sample]));

    expect(report.passed).toBe(true);
    expect(report.regressions).toBe(0);
    expect(report.results[0]?.outcome).toBe("still-failing");
  });

  it("marks triaged issue as still-failing without failing the gate", async () => {
    const sample = makeSample("You should definitely buy Tesla stock.");
    const issue = makeIssue("triaged", [sample.id], "advice-boundary-v1");
    const runner = new RegressionRunner([advice]);
    const report = await runner.run(makeStore([issue], [sample]));

    expect(report.passed).toBe(true);
    expect(report.results[0]?.outcome).toBe("still-failing");
  });

  it("only runs evaluators specified in evalCriteria", async () => {
    const sample = makeSample("Your SSN is 123-45-6789.");
    // Issue only specifies advice-boundary, not PII
    const issue = makeIssue("resolved", [sample.id], "advice-boundary-v1");
    const runner = new RegressionRunner([pii, advice]);
    const report = await runner.run(makeStore([issue], [sample]));

    // advice-boundary sees no violation on PII text → pass → no regression
    expect(report.results[0]?.outcome).toBe("pass");
    const evalIds = report.results[0]?.sampleResults[0]?.evalResults.map(
      (r) => r.evaluatorId
    );
    expect(evalIds).not.toContain("pii-leakage-v1");
    expect(evalIds).toContain("advice-boundary-v1");
  });

  it("runs all evaluators when evalCriteria is empty", async () => {
    const sample = makeSample("Your SSN is 123-45-6789.");
    const issue: Issue = {
      id: randomUUID(),
      title: "No criteria issue",
      status: "open",
      sampleIds: [sample.id],
      evalCriteria: [],
      createdAt: now,
      updatedAt: now,
    };
    const runner = new RegressionRunner([pii, advice]);
    const report = await runner.run(makeStore([issue], [sample]));

    const evalIds = report.results[0]?.sampleResults[0]?.evalResults.map(
      (r) => r.evaluatorId
    );
    expect(evalIds).toContain("pii-leakage-v1");
    expect(evalIds).toContain("advice-boundary-v1");
  });

  it("handles missing sample gracefully", async () => {
    const issue = makeIssue("resolved", ["nonexistent-id-1234-5678-9012-123456789012"]);
    const runner = new RegressionRunner([pii]);
    const report = await runner.run(makeStore([issue], []));

    expect(report.passed).toBe(true);
    expect(report.results[0]?.sampleResults[0]?.missing).toBe(true);
  });

  it("reports multiple issues independently", async () => {
    const passSample = makeSample("No issues here.");
    const failSample = makeSample("Your SSN is 123-45-6789.");
    const resolvedPassing = makeIssue("resolved", [passSample.id]);
    const resolvedRegressed = makeIssue("resolved", [failSample.id]);

    const runner = new RegressionRunner([pii]);
    const report = await runner.run(
      makeStore([resolvedPassing, resolvedRegressed], [passSample, failSample])
    );

    expect(report.regressions).toBe(1);
    expect(report.passed).toBe(false);
    const outcomes = report.results.map((r) => r.outcome);
    expect(outcomes).toContain("pass");
    expect(outcomes).toContain("regressed");
  });
});
