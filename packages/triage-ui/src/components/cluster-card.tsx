"use client";

import { useState } from "react";
import type { FailureCluster } from "@compliance-evals/core";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-slate-100 text-slate-600 border-slate-200",
  info: "bg-blue-100 text-blue-700 border-blue-200",
};

export function ClusterCard({ cluster }: { cluster: FailureCluster }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const severityClass =
    cluster.severity ? SEVERITY_COLORS[cluster.severity] ?? "bg-slate-100 text-slate-600 border-slate-200" : "";

  async function handleCreate() {
    setState("loading");
    try {
      const res = await fetch("/api/issues", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: cluster.suggestedTitle,
          sampleIds: cluster.sampleIds,
          evalCriteria: cluster.suggestedCriteria,
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || res.statusText);
      }
      setState("done");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Unknown error");
      setState("error");
    }
  }

  return (
    <div className="border border-slate-200 rounded-lg px-4 py-4 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-sm font-medium text-slate-900 font-mono">
            {cluster.evaluatorId}
          </span>
          {cluster.severity && (
            <span
              className={`text-xs font-medium px-1.5 py-0.5 rounded border ${severityClass}`}
            >
              {cluster.severity}
            </span>
          )}
          <span className="text-xs text-slate-500">
            {cluster.sampleIds.length} sample{cluster.sampleIds.length === 1 ? "" : "s"}
          </span>
        </div>
        <p className="text-xs text-slate-400 truncate">
          {cluster.suggestedTitle}
        </p>
        {state === "error" && (
          <p className="text-xs text-red-600 mt-1">{errorMsg}</p>
        )}
      </div>

      <div className="flex-shrink-0">
        {state === "done" ? (
          <span className="text-xs text-green-700 font-medium">Issue created</span>
        ) : (
          <button
            onClick={handleCreate}
            disabled={state === "loading"}
            className="text-xs font-medium px-3 py-1.5 rounded border border-blue-600 text-blue-700 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={`Create issue for ${cluster.evaluatorId} cluster`}
          >
            {state === "loading" ? "Creating…" : "Create issue"}
          </button>
        )}
      </div>
    </div>
  );
}
