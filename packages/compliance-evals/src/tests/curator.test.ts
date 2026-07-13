import { describe, it, expect } from "vitest";
import { randomUUID } from "crypto";
import type { AuditStore } from "../store/audit-store.js";
import type { EvalResult, Issue, Sample } from "@compliance-evals/types";
import { AutoCurator } from "../curation/curator.js";

const now = new Date("2024-01-15T10:00:00Z");

function makeResult(
  sampleId: string,
  evaluatorId: string,
  verdict: "pass" | "fail",
  severity?: EvalResult["severity"]
): EvalResult {
  return {
    id: randomUUID(),
    sampleId,
    evaluatorId,
    evaluatorVersion: "1.0.0",
    verdict,
    severity,
    reasoning: "test",
    createdAt: now,
  };
}

function makeIssue(sampleIds: string[]): Issue {
  return {
    id: randomUUID(),
    title: "Existing issue",
    status: "open",
    sampleIds,
    evalCriteria: [],
    createdAt: now,
    updatedAt: now,
  };
}

function makeStore(
  results: EvalResult[],
  issues: Issue[] = []
): Pick<AuditStore, "listResults" | "listIssues"> {
  return {
    listResults: () => results,
    listIssues: () => issues,
  } as unknown as AuditStore;
}

describe("AutoCurator", () => {
  const curator = new AutoCurator();

  it("returns empty clusters when no results", () => {
    const report = curator.run(makeStore([]));
    expect(report.clusters).toHaveLength(0);
    expect(report.totalFailingSamples).toBe(0);
  });

  it("ignores passing results", () => {
    const sampleId = randomUUID();
    const report = curator.run(makeStore([makeResult(sampleId, "pii-leakage-v1", "pass")]));
    expect(report.clusters).toHaveLength(0);
    expect(report.totalFailingSamples).toBe(0);
  });

  it("clusters failing results by evaluatorId+severity", () => {
    const s1 = randomUUID();
    const s2 = randomUUID();
    const s3 = randomUUID();
    const results = [
      makeResult(s1, "pii-leakage-v1", "fail", "critical"),
      makeResult(s2, "pii-leakage-v1", "fail", "critical"),
      makeResult(s3, "pii-leakage-v1", "fail", "medium"),
    ];
    const report = curator.run(makeStore(results));
    expect(report.clusters).toHaveLength(2);
    const critical = report.clusters.find((c) => c.severity === "critical");
    expect(critical?.sampleIds).toHaveLength(2);
    const medium = report.clusters.find((c) => c.severity === "medium");
    expect(medium?.sampleIds).toHaveLength(1);
  });

  it("separates clusters by evaluatorId", () => {
    const s1 = randomUUID();
    const s2 = randomUUID();
    const results = [
      makeResult(s1, "pii-leakage-v1", "fail", "high"),
      makeResult(s2, "advice-boundary-v1", "fail", "high"),
    ];
    const report = curator.run(makeStore(results));
    expect(report.clusters).toHaveLength(2);
    const evals = report.clusters.map((c) => c.evaluatorId).sort();
    expect(evals).toEqual(["advice-boundary-v1", "pii-leakage-v1"]);
  });

  it("excludes samples already in promoted issues", () => {
    const promoted = randomUUID();
    const fresh = randomUUID();
    const results = [
      makeResult(promoted, "pii-leakage-v1", "fail", "critical"),
      makeResult(fresh, "pii-leakage-v1", "fail", "critical"),
    ];
    const issues = [makeIssue([promoted])];
    const report = curator.run(makeStore(results, issues));
    expect(report.clusters).toHaveLength(1);
    expect(report.clusters[0]?.sampleIds).toEqual([fresh]);
    expect(report.alreadyPromoted).toBe(1);
  });

  it("deduplicates sampleIds within a cluster", () => {
    const sampleId = randomUUID();
    const results = [
      makeResult(sampleId, "pii-leakage-v1", "fail", "critical"),
      makeResult(sampleId, "pii-leakage-v1", "fail", "critical"),
    ];
    const report = curator.run(makeStore(results));
    expect(report.clusters[0]?.sampleIds).toHaveLength(1);
  });

  it("sorts clusters by sample count descending", () => {
    const results = [
      makeResult(randomUUID(), "advice-boundary-v1", "fail"),
      makeResult(randomUUID(), "pii-leakage-v1", "fail"),
      makeResult(randomUUID(), "pii-leakage-v1", "fail"),
      makeResult(randomUUID(), "pii-leakage-v1", "fail"),
    ];
    const report = curator.run(makeStore(results));
    expect(report.clusters[0]?.sampleIds.length).toBeGreaterThanOrEqual(
      report.clusters[1]?.sampleIds.length ?? 0
    );
  });

  it("includes suggestedTitle and suggestedCriteria", () => {
    const report = curator.run(
      makeStore([makeResult(randomUUID(), "pii-leakage-v1", "fail", "high")])
    );
    const cluster = report.clusters[0]!;
    expect(cluster.suggestedTitle).toContain("pii-leakage-v1");
    expect(cluster.suggestedTitle).toContain("high");
    expect(cluster.suggestedCriteria[0]?.evaluatorId).toBe("pii-leakage-v1");
    expect(cluster.suggestedCriteria[0]?.verdict).toBe("fail");
  });

  it("handles missing severity gracefully", () => {
    const report = curator.run(
      makeStore([makeResult(randomUUID(), "pii-leakage-v1", "fail")])
    );
    expect(report.clusters[0]?.severity).toBeNull();
    expect(report.clusters[0]?.fingerprint).toBe("pii-leakage-v1:none");
  });
});
