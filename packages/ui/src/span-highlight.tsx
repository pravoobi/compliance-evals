import * as React from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import type { EvalSpan } from "@compliance-evals/types";
import { cn } from "./utils.js";

const SEVERITY_COLORS: Record<string, string> = {
  SSN: "bg-red-200 text-red-900 border-red-400",
  CREDIT_CARD: "bg-red-200 text-red-900 border-red-400",
  IBAN: "bg-red-200 text-red-900 border-red-400",
  US_ROUTING_NUMBER: "bg-orange-200 text-orange-900 border-orange-400",
  EMAIL: "bg-yellow-200 text-yellow-900 border-yellow-400",
  US_PHONE: "bg-yellow-200 text-yellow-900 border-yellow-400",
};

interface SpanHighlightProps {
  text: string;
  spans?: EvalSpan[];
  className?: string;
}

export function SpanHighlight({ text, spans = [], className }: SpanHighlightProps) {
  if (spans.length === 0) {
    return (
      <pre className={cn("whitespace-pre-wrap font-mono text-sm", className)}>
        {text}
      </pre>
    );
  }

  const sorted = [...spans].sort((a, b) => a.start - b.start);
  const parts: React.ReactNode[] = [];
  let cursor = 0;

  for (const span of sorted) {
    if (span.start > cursor) {
      parts.push(text.slice(cursor, span.start));
    }
    const colorClass =
      SEVERITY_COLORS[span.label] ?? "bg-purple-200 text-purple-900 border-purple-400";
    parts.push(
      <Tooltip.Provider key={`${span.start}-${span.end}`} delayDuration={150}>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <mark
              className={cn(
                "rounded-sm border px-0.5 cursor-help",
                colorClass
              )}
              aria-label={`${span.label} detected`}
            >
              {span.text}
            </mark>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              className="z-50 rounded bg-slate-900 px-2 py-1 text-xs text-white shadow-md"
              sideOffset={4}
            >
              {span.label}
              {span.confidence !== undefined && (
                <span className="ml-1 opacity-75">
                  ({Math.round(span.confidence * 100)}%)
                </span>
              )}
              <Tooltip.Arrow className="fill-slate-900" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
    );
    cursor = span.end;
  }

  if (cursor < text.length) {
    parts.push(text.slice(cursor));
  }

  return (
    <pre className={cn("whitespace-pre-wrap font-mono text-sm", className)}>
      {parts}
    </pre>
  );
}
