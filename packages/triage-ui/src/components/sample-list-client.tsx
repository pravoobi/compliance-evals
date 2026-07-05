"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import type { EvalResult, Sample } from "@compliance-evals/types";
import { Badge } from "@compliance-evals/ui";

interface Row {
  sample: Sample;
  results: EvalResult[];
}

function worstVerdict(results: EvalResult[]): "fail" | "warn" | "pass" | null {
  if (results.length === 0) return null;
  if (results.some((r) => r.verdict === "fail")) return "fail";
  if (results.some((r) => r.verdict === "warn")) return "warn";
  return "pass";
}

function VerdictBadge({ verdict }: { verdict: "fail" | "warn" | "pass" | null }) {
  if (!verdict) return <Badge variant="outline">pending</Badge>;
  return (
    <Badge
      variant={
        verdict === "fail"
          ? "destructive"
          : verdict === "warn"
          ? "warning"
          : "success"
      }
    >
      {verdict}
    </Badge>
  );
}

const VERDICT_ORDER = { fail: 0, warn: 1, pass: 2, null: 3 } as const;

export function SampleListClient({ rows }: { rows: Row[] }) {
  const [filter, setFilter] = useState<"all" | "fail" | "warn" | "pass">("all");
  const [selected, setSelected] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);

  const filtered = rows.filter((r) => {
    if (filter === "all") return true;
    return worstVerdict(r.results) === filter;
  });

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        setSelected((p) => Math.min(p + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        setSelected((p) => Math.max(p - 1, 0));
      } else if (e.key === "Enter") {
        const row = filtered[selected];
        if (row) window.location.href = `/samples/${row.sample.id}`;
      }
    },
    [filtered, selected]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  // Auto-focus the grid on mount so arrow keys work without clicking first
  useEffect(() => {
    gridRef.current?.focus();
  }, []);

  return (
    <div>
      <div
        role="tablist"
        aria-label="Filter by verdict"
        className="flex gap-1 mb-3"
      >
        {(["all", "fail", "warn", "pass"] as const).map((v) => (
          <button
            key={v}
            role="tab"
            aria-selected={filter === v}
            onClick={() => { setFilter(v); setSelected(0); }}
            className={`px-3 py-1 text-xs rounded border transition-colors ${
              filter === v
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
            }`}
          >
            {v}
            <span className="ml-1 opacity-60">
              (
              {v === "all"
                ? rows.length
                : rows.filter((r) => worstVerdict(r.results) === v).length}
              )
            </span>
          </button>
        ))}
      </div>

      <div
        ref={gridRef}
        role="grid"
        aria-label="Sample list"
        tabIndex={0}
        className="border border-slate-200 rounded-lg overflow-hidden outline-none"
      >
        <div
          role="row"
          className="grid grid-cols-[2fr_1fr_1fr_100px] gap-4 px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500"
        >
          <span role="columnheader">Input</span>
          <span role="columnheader">Evaluators</span>
          <span role="columnheader">Worst verdict</span>
          <span role="columnheader">When</span>
        </div>

        {filtered.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-slate-400">
            No samples match this filter.
          </div>
        )}

        {filtered.map((row, i) => {
          const verdict = worstVerdict(row.results);
          const isSelected = i === selected;
          return (
            <Link
              key={row.sample.id}
              href={`/samples/${row.sample.id}`}
              role="row"
              aria-selected={isSelected}
              tabIndex={isSelected ? 0 : -1}
              onFocus={() => setSelected(i)}
              className={`grid grid-cols-[2fr_1fr_1fr_100px] gap-4 px-4 py-3 border-b border-slate-100 last:border-0 text-sm transition-colors ${
                isSelected
                  ? "bg-blue-50 ring-1 ring-inset ring-blue-300"
                  : "hover:bg-slate-50"
              }`}
            >
              <span className="truncate text-slate-800">{row.sample.input}</span>
              <span className="text-slate-500 text-xs">
                {row.results.map((r) => r.evaluatorId.replace("-v1", "")).join(", ")}
              </span>
              <span>
                <VerdictBadge verdict={verdict} />
              </span>
              <span className="text-slate-400 text-xs">
                {new Date(row.sample.createdAt).toLocaleDateString()}
              </span>
            </Link>
          );
        })}
      </div>

      <p className="mt-2 text-xs text-slate-400">
        ↑↓ / j k to navigate · Enter to open
      </p>
    </div>
  );
}
