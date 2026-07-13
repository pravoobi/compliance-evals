"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@compliance-evals/ui";
import type { DisagreementRow } from "@/app/meta-eval/page";

type Filter = "all" | "false-positive" | "false-negative";

export function DisagreementsClient({
  disagreements,
}: {
  disagreements: DisagreementRow[];
}) {
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = disagreements.filter(
    (d) => filter === "all" || d.type === filter
  );

  if (disagreements.length === 0) {
    return (
      <div className="text-center py-10 text-slate-400 border border-dashed border-slate-300 rounded-lg text-sm">
        No disagreements yet — judge and reviewer are in full agreement.
      </div>
    );
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label="Filter disagreements"
        className="flex gap-1 mb-3"
      >
        {(
          [
            { id: "all" as Filter, label: "All" },
            { id: "false-positive" as Filter, label: "False positives" },
            { id: "false-negative" as Filter, label: "False negatives" },
          ] as const
        ).map(({ id, label }) => {
          const count =
            id === "all"
              ? disagreements.length
              : disagreements.filter((d) => d.type === id).length;
          return (
            <button
              key={id}
              role="tab"
              aria-selected={filter === id}
              onClick={() => setFilter(id)}
              className={`px-3 py-1 text-xs rounded border transition-colors ${
                filter === id
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
              }`}
            >
              {label}{" "}
              <span className="opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-sm border border-dashed border-slate-300 rounded-lg">
          No {filter === "false-positive" ? "false positives" : "false negatives"} recorded.
        </div>
      ) : (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="grid grid-cols-[1.5fr_1.2fr_1fr_1fr_1fr_100px] gap-3 px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500">
            <span>Sample</span>
            <span>Evaluator</span>
            <span>Eval verdict</span>
            <span>Human action</span>
            <span>Reviewer</span>
            <span>Date</span>
          </div>
          {filtered.map((row) => (
            <div
              key={row.auditRecordId}
              className="grid grid-cols-[1.5fr_1.2fr_1fr_1fr_1fr_100px] gap-3 px-4 py-3 border-b border-slate-100 last:border-0 text-sm hover:bg-slate-50"
            >
              <Link
                href={`/samples/${row.sampleId}`}
                className="text-blue-600 hover:underline truncate font-mono text-xs"
                aria-label={`View sample ${row.sampleId.slice(0, 8)}`}
              >
                {row.sampleId.slice(0, 8)}…
              </Link>
              <span className="text-slate-700 truncate text-xs">
                {row.evaluatorName}
              </span>
              <span>
                <Badge
                  variant={
                    row.evalVerdict === "fail"
                      ? "destructive"
                      : row.evalVerdict === "warn"
                      ? "warning"
                      : "success"
                  }
                >
                  {row.evalVerdict}
                </Badge>
              </span>
              <span>
                <Badge
                  variant={
                    row.humanAction === "rejected" ? "destructive" : "success"
                  }
                >
                  {row.humanAction}
                </Badge>
              </span>
              <span className="text-slate-500 text-xs truncate">
                {row.actor}
                {row.reason && (
                  <span
                    className="block text-slate-400 truncate"
                    title={row.reason}
                  >
                    {row.reason}
                  </span>
                )}
              </span>
              <span className="text-slate-400 text-xs">
                {new Date(row.reviewedAt).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="mt-2 text-xs text-slate-400">
        False positive: evaluator flagged, reviewer accepted.{" "}
        False negative: evaluator passed, reviewer rejected.
      </p>
    </div>
  );
}
