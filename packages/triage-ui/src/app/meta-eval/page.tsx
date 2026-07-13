import { getStore } from "@/lib/db";
import { DisagreementsClient } from "@/components/disagreements-client";
import type { AuditRecord, EvalResult } from "@compliance-evals/types";

export const dynamic = "force-dynamic";

const EVALUATOR_LABELS: Record<string, string> = {
  "pii-leakage-v1": "PII Leakage",
  "groundedness-deterministic-v1": "Groundedness (stub)",
  "groundedness-llm-v1": "Groundedness (LLM)",
  "advice-boundary-v1": "Advice Boundary",
  "advice-boundary-llm-v1": "Advice Boundary (LLM)",
};

function labelFor(id: string): string {
  return EVALUATOR_LABELS[id] ?? id;
}

export interface DisagreementRow {
  auditRecordId: string;
  sampleId: string;
  evaluatorId: string;
  evaluatorName: string;
  evalVerdict: string;
  humanAction: string;
  actor: string;
  reason?: string;
  reviewedAt: string;
  type: "false-positive" | "false-negative";
}

interface EvaluatorStats {
  evaluatorId: string;
  evaluatorName: string;
  tp: number;
  fp: number;
  fn: number;
  tn: number;
}

function computeAlignment(
  auditRecords: AuditRecord[],
  allResults: EvalResult[]
): { stats: EvaluatorStats[]; disagreements: DisagreementRow[] } {
  const resultById = new Map(allResults.map((r) => [r.id, r]));
  const statsMap = new Map<string, EvaluatorStats>();
  const disagreements: DisagreementRow[] = [];

  for (const record of auditRecords) {
    if (record.action !== "accept" && record.action !== "reject") continue;
    const result = resultById.get(record.resultId);
    if (!result) continue;

    const { evaluatorId } = result;
    if (!statsMap.has(evaluatorId)) {
      statsMap.set(evaluatorId, {
        evaluatorId,
        evaluatorName: labelFor(evaluatorId),
        tp: 0,
        fp: 0,
        fn: 0,
        tn: 0,
      });
    }
    const s = statsMap.get(evaluatorId)!;
    const evalFailed = result.verdict === "fail";
    const humanRejected = record.action === "reject";

    if (evalFailed && humanRejected) {
      s.tp++;
    } else if (evalFailed && !humanRejected) {
      s.fp++;
      disagreements.push({
        auditRecordId: record.id,
        sampleId: result.sampleId,
        evaluatorId,
        evaluatorName: labelFor(evaluatorId),
        evalVerdict: result.verdict,
        humanAction: record.action,
        actor: record.actor,
        reason: record.reason,
        reviewedAt: record.createdAt.toISOString(),
        type: "false-positive",
      });
    } else if (!evalFailed && humanRejected) {
      s.fn++;
      disagreements.push({
        auditRecordId: record.id,
        sampleId: result.sampleId,
        evaluatorId,
        evaluatorName: labelFor(evaluatorId),
        evalVerdict: result.verdict,
        humanAction: record.action,
        actor: record.actor,
        reason: record.reason,
        reviewedAt: record.createdAt.toISOString(),
        type: "false-negative",
      });
    } else {
      s.tn++;
    }
  }

  const stats = [...statsMap.values()].sort((a, b) => {
    const totalA = a.tp + a.fp + a.fn + a.tn;
    const totalB = b.tp + b.fp + b.fn + b.tn;
    return totalB - totalA;
  });

  return { stats, disagreements };
}

function pct(n: number, d: number): string {
  if (d === 0) return "—";
  return `${Math.round((n / d) * 100)}%`;
}

export default function MetaEvalPage() {
  const store = getStore();
  const auditRecords = store.listAuditRecords();
  const allResults = store.listResults();

  const { stats, disagreements } = computeAlignment(auditRecords, allResults);

  const totalReviewed = stats.reduce((sum, s) => sum + s.tp + s.fp + s.fn + s.tn, 0);
  const totalAgreed = stats.reduce((sum, s) => sum + s.tp + s.tn, 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-slate-900">Meta-Evaluation</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Judge alignment against human reviewer decisions
        </p>
      </div>

      {totalReviewed === 0 ? (
        <div className="text-center py-16 text-slate-400 border border-dashed border-slate-300 rounded-lg text-sm">
          No reviewer decisions yet. Accept or reject flagged samples to build alignment data.
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: "Total reviewed", value: totalReviewed },
              {
                label: "Overall agreement",
                value: pct(totalAgreed, totalReviewed),
              },
              { label: "Disagreements", value: disagreements.length },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="border border-slate-200 rounded-lg px-4 py-3"
              >
                <div className="text-xs text-slate-500 mb-1">{label}</div>
                <div className="text-2xl font-semibold text-slate-900">
                  {value}
                </div>
              </div>
            ))}
          </div>

          {/* Per-evaluator stats */}
          <section aria-labelledby="evaluator-stats-heading" className="mb-8">
            <h2
              id="evaluator-stats-heading"
              className="text-sm font-semibold text-slate-700 mb-2"
            >
              Per-evaluator alignment
            </h2>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500">
                <span>Evaluator</span>
                <span className="text-right">Reviewed</span>
                <span className="text-right">Agreement</span>
                <span className="text-right">Precision</span>
                <span className="text-right">False pos.</span>
                <span className="text-right">False neg.</span>
              </div>
              {stats.map((s) => {
                const total = s.tp + s.fp + s.fn + s.tn;
                return (
                  <div
                    key={s.evaluatorId}
                    className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 border-b border-slate-100 last:border-0 text-sm"
                  >
                    <span className="text-slate-800 font-medium">
                      {s.evaluatorName}
                    </span>
                    <span className="text-right text-slate-600">{total}</span>
                    <span className="text-right text-slate-600">
                      {pct(s.tp + s.tn, total)}
                    </span>
                    <span className="text-right text-slate-600">
                      {pct(s.tp, s.tp + s.fp)}
                    </span>
                    <span
                      className={`text-right font-medium ${
                        s.fp > 0 ? "text-amber-600" : "text-slate-400"
                      }`}
                    >
                      {s.fp}
                    </span>
                    <span
                      className={`text-right font-medium ${
                        s.fn > 0 ? "text-red-600" : "text-slate-400"
                      }`}
                    >
                      {s.fn}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="mt-1.5 text-xs text-slate-400">
              Precision = TP / (TP + FP). False neg. = reviewer rejected a sample the evaluator passed.
            </p>
          </section>

          {/* Disagreements */}
          <section aria-labelledby="disagreements-heading">
            <h2
              id="disagreements-heading"
              className="text-sm font-semibold text-slate-700 mb-2"
            >
              Disagreements
            </h2>
            <DisagreementsClient disagreements={disagreements} />
          </section>
        </>
      )}
    </div>
  );
}
