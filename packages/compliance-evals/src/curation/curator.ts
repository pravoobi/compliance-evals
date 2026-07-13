import type { EvalResult, Issue } from "@compliance-evals/types";
import type { AuditStore } from "../store/audit-store.js";

export interface FailureCluster {
  fingerprint: string;
  evaluatorId: string;
  severity: string | null;
  sampleIds: string[];
  suggestedTitle: string;
  suggestedCriteria: { evaluatorId: string; verdict: "fail"; description: string }[];
}

export interface CurationReport {
  generatedAt: Date;
  totalFailingSamples: number;
  alreadyPromoted: number;
  clusters: FailureCluster[];
}

export class AutoCurator {
  run(store: AuditStore): CurationReport {
    const issues = store.listIssues();
    const promotedSampleIds = new Set(issues.flatMap((i: Issue) => i.sampleIds));

    const allResults = store.listResults();
    const failing = allResults.filter(
      (r: EvalResult) => r.verdict === "fail" && !promotedSampleIds.has(r.sampleId)
    );

    const clusterMap = new Map<string, { results: EvalResult[] }>();
    for (const result of failing) {
      const key = `${result.evaluatorId}:${result.severity ?? "none"}`;
      let entry = clusterMap.get(key);
      if (!entry) {
        entry = { results: [] };
        clusterMap.set(key, entry);
      }
      entry.results.push(result);
    }

    const clusters: FailureCluster[] = [];
    for (const [fingerprint, { results }] of clusterMap) {
      const uniqueSamples = [...new Set(results.map((r) => r.sampleId))];
      const first = results[0]!;
      const severityLabel = first.severity ? ` (${first.severity})` : "";

      clusters.push({
        fingerprint,
        evaluatorId: first.evaluatorId,
        severity: first.severity ?? null,
        sampleIds: uniqueSamples,
        suggestedTitle: `${first.evaluatorId}${severityLabel} — ${uniqueSamples.length} failing sample${uniqueSamples.length === 1 ? "" : "s"}`,
        suggestedCriteria: [
          {
            evaluatorId: first.evaluatorId,
            verdict: "fail",
            description: `Samples failing ${first.evaluatorId}${severityLabel}`,
          },
        ],
      });
    }

    clusters.sort((a, b) => b.sampleIds.length - a.sampleIds.length);

    return {
      generatedAt: new Date(),
      totalFailingSamples: new Set(failing.map((r) => r.sampleId)).size,
      alreadyPromoted: promotedSampleIds.size,
      clusters,
    };
  }
}
