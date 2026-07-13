import type { EvalResult, Issue } from "@compliance-evals/types";
import type { AuditStore } from "../store/audit-store.js";
import type { Evaluator } from "../evaluator.js";

export interface SampleCheckResult {
  sampleId: string;
  missing: boolean;
  evalResults: EvalResult[];
  verdict: "pass" | "fail";
}

export type IssueOutcome = "pass" | "still-failing" | "regressed";

export interface IssueCheckResult {
  issueId: string;
  issueTitle: string;
  issueStatus: Issue["status"];
  sampleResults: SampleCheckResult[];
  outcome: IssueOutcome;
}

export interface RegressionReport {
  checkedAt: Date;
  totalIssues: number;
  regressions: number;
  results: IssueCheckResult[];
  passed: boolean;
}

export class RegressionRunner {
  private readonly evaluatorMap: Map<string, Evaluator>;

  constructor(private readonly evaluators: Evaluator[]) {
    this.evaluatorMap = new Map(evaluators.map((e) => [e.id, e]));
  }

  async run(store: AuditStore): Promise<RegressionReport> {
    const issues = store.listIssues();
    const results: IssueCheckResult[] = [];

    for (const issue of issues) {
      const criteriaIds = new Set(issue.evalCriteria.map((c) => c.evaluatorId));
      const relevant =
        criteriaIds.size > 0
          ? this.evaluators.filter((e) => criteriaIds.has(e.id))
          : this.evaluators;

      const sampleResults: SampleCheckResult[] = [];

      for (const sampleId of issue.sampleIds) {
        const sample = store.getSample(sampleId);
        if (!sample) {
          sampleResults.push({ sampleId, missing: true, evalResults: [], verdict: "pass" });
          continue;
        }

        const evalResults: EvalResult[] = [];
        let anyFail = false;

        for (const evaluator of relevant) {
          const result = await evaluator.evaluate(sample);
          evalResults.push(result);
          if (result.verdict === "fail") anyFail = true;
        }

        sampleResults.push({ sampleId, missing: false, evalResults, verdict: anyFail ? "fail" : "pass" });
      }

      const anySampleFails = sampleResults.some((s) => s.verdict === "fail");

      let outcome: IssueOutcome;
      if (issue.status === "resolved" && anySampleFails) {
        outcome = "regressed";
      } else if (
        (issue.status === "open" || issue.status === "triaged") &&
        anySampleFails
      ) {
        outcome = "still-failing";
      } else {
        outcome = "pass";
      }

      results.push({
        issueId: issue.id,
        issueTitle: issue.title,
        issueStatus: issue.status,
        sampleResults,
        outcome,
      });
    }

    const regressions = results.filter((r) => r.outcome === "regressed").length;

    return {
      checkedAt: new Date(),
      totalIssues: issues.length,
      regressions,
      results,
      passed: regressions === 0,
    };
  }
}
