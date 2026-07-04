"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import type { EvalResult, Sample } from "@compliance-evals/types";
import { Badge, Button, SpanHighlight } from "@compliance-evals/ui";

interface Props {
  sample: Sample;
  results: EvalResult[];
}

function VerdictBadge({ v }: { v: "pass" | "fail" | "warn" }) {
  return (
    <Badge
      variant={v === "fail" ? "destructive" : v === "warn" ? "warning" : "success"}
    >
      {v}
    </Badge>
  );
}

interface ReviewState {
  [resultId: string]: { done: boolean; action: "accept" | "reject" };
}

export function SampleDetailClient({ sample, results }: Props) {
  const [activeResultId, setActiveResultId] = useState<string>(
    results[0]?.id ?? ""
  );
  const [reason, setReason] = useState("");
  const [actor, setActor] = useState("reviewer");
  const [reviews, setReviews] = useState<ReviewState>({});
  const [promoting, setPromoting] = useState(false);
  const [issueTitle, setIssueTitle] = useState("");
  const [issueCreated, setIssueCreated] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const activeResult = results.find((r) => r.id === activeResultId) ?? results[0];

  const toast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  async function submitReview(action: "accept" | "reject") {
    if (!activeResult) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resultId: activeResult.id,
          actor,
          action,
          reason: reason || undefined,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setReviews((prev) => ({
        ...prev,
        [activeResult.id]: { done: true, action },
      }));
      setReason("");
      toast(`${action === "accept" ? "Accepted" : "Rejected"} — audit record written.`);
    } catch (err) {
      toast(`Error: ${String(err)}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function promoteToIssue() {
    if (!issueTitle.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: issueTitle,
          sampleIds: [sample.id],
          evalCriteria: activeResult
            ? [
                {
                  evaluatorId: activeResult.evaluatorId,
                  verdict: activeResult.verdict,
                  description: activeResult.reasoning.slice(0, 200),
                },
              ]
            : [],
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const issue = (await res.json()) as { id: string };
      setIssueCreated(issue.id);
      setPromoting(false);
      toast("Issue created.");
    } catch (err) {
      toast(`Error: ${String(err)}`);
    } finally {
      setSubmitting(false);
    }
  }

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "a") submitReview("accept");
      if (e.key === "r") submitReview("reject");
      if (e.key === "p") setPromoting((v) => !v);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeResult, actor, reason]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-800">
          ← Samples
        </Link>
        <span>/</span>
        <span className="text-slate-700 font-mono text-xs truncate max-w-xs">
          {sample.id}
        </span>
      </div>

      {/* Input / context / output */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Input
          </h2>
          <div className="bg-white border border-slate-200 rounded-lg p-3 text-sm text-slate-800">
            {sample.input}
          </div>
        </div>
        {sample.context && (
          <div>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
              Context
            </h2>
            <div className="bg-white border border-slate-200 rounded-lg p-3 text-sm text-slate-800">
              {sample.context}
            </div>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
          Output
        </h2>
        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <SpanHighlight
            text={sample.output}
            spans={activeResult?.spans}
          />
        </div>
      </div>

      {/* Evaluator tabs */}
      <div>
        <div className="flex gap-1 mb-2" role="tablist" aria-label="Evaluator results">
          {results.map((r) => (
            <button
              key={r.id}
              role="tab"
              aria-selected={r.id === activeResultId}
              onClick={() => setActiveResultId(r.id)}
              className={`px-3 py-1 text-xs rounded border flex items-center gap-2 transition-colors ${
                r.id === activeResultId
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
              }`}
            >
              {r.evaluatorId.replace("-v1", "")}
              <Badge
                variant={
                  r.verdict === "fail"
                    ? "destructive"
                    : r.verdict === "warn"
                    ? "warning"
                    : "success"
                }
              >
                {r.verdict}
              </Badge>
            </button>
          ))}
        </div>

        {activeResult && (
          <div
            role="tabpanel"
            className="bg-white border border-slate-200 rounded-lg p-4 space-y-3"
          >
            <div className="flex items-center gap-3">
              <VerdictBadge v={activeResult.verdict} />
              {activeResult.severity && (
                <Badge variant="outline">{activeResult.severity}</Badge>
              )}
              {activeResult.score !== undefined && (
                <span className="text-xs text-slate-500">
                  score: {activeResult.score.toFixed(3)}
                </span>
              )}
              {reviews[activeResult.id] && (
                <Badge variant="secondary">
                  reviewed: {reviews[activeResult.id]!.action}
                </Badge>
              )}
            </div>

            <div>
              <p className="text-xs font-medium text-slate-500 mb-0.5">Reasoning</p>
              <p className="text-sm text-slate-700">{activeResult.reasoning}</p>
            </div>

            {activeResult.coverage && (
              <details className="text-xs text-slate-500">
                <summary className="cursor-pointer hover:text-slate-700">
                  Coverage statement
                </summary>
                <p className="mt-1 pl-2 border-l-2 border-slate-200">
                  {activeResult.coverage}
                </p>
              </details>
            )}

            {activeResult.spans && activeResult.spans.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">
                  Detected spans ({activeResult.spans.length})
                </p>
                <div className="flex flex-wrap gap-1">
                  {activeResult.spans.map((span, i) => (
                    <Badge key={i} variant="destructive" className="font-mono text-xs">
                      {span.label}: {span.text}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Review panel */}
      <div className="border border-slate-200 rounded-lg p-4 space-y-3 bg-white">
        <h2 className="text-sm font-semibold text-slate-800">Reviewer sign-off</h2>
        <div className="flex gap-3 items-center flex-wrap">
          <div className="flex items-center gap-2">
            <label htmlFor="actor" className="text-xs text-slate-500">
              Actor
            </label>
            <input
              id="actor"
              type="text"
              value={actor}
              onChange={(e) => setActor(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1 text-xs w-36"
              placeholder="reviewer name"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="reason" className="sr-only">
              Reason
            </label>
            <input
              id="reason"
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason (optional)"
              className="border border-slate-300 rounded px-2 py-1 text-xs w-full"
            />
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="accept"
            size="sm"
            onClick={() => submitReview("accept")}
            disabled={submitting || !activeResult || !!reviews[activeResult.id]}
            aria-label="Accept this evaluation (A)"
          >
            Accept (A)
          </Button>
          <Button
            variant="reject"
            size="sm"
            onClick={() => submitReview("reject")}
            disabled={submitting || !activeResult || !!reviews[activeResult.id]}
            aria-label="Reject this evaluation (R)"
          >
            Reject (R)
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPromoting((v) => !v)}
            aria-label="Promote to issue (P)"
          >
            {promoting ? "Cancel" : "Promote to Issue (P)"}
          </Button>
        </div>

        {promoting && (
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={issueTitle}
              onChange={(e) => setIssueTitle(e.target.value)}
              placeholder="Issue title…"
              className="border border-slate-300 rounded px-2 py-1 text-xs flex-1"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") promoteToIssue();
              }}
            />
            <Button
              variant="default"
              size="sm"
              onClick={promoteToIssue}
              disabled={submitting || !issueTitle.trim()}
            >
              Create
            </Button>
          </div>
        )}

        {issueCreated && (
          <p className="text-xs text-emerald-700">
            Issue created:{" "}
            <Link href="/issues" className="underline">
              view issues
            </Link>
          </p>
        )}
      </div>

      {/* Keyboard shortcuts */}
      <p className="text-xs text-slate-400">
        Keyboard: A = accept · R = reject · P = promote to issue
      </p>

      {/* Toast */}
      {toastMsg && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 right-4 bg-slate-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg"
        >
          {toastMsg}
        </div>
      )}
    </div>
  );
}
