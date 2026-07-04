import { getStore } from "@/lib/db";
import Link from "next/link";
import { Badge } from "@compliance-evals/ui";

export const dynamic = "force-dynamic";

export default function IssuesPage() {
  const store = getStore();
  const issues = store.listIssues();

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-slate-900">
          Issues
          <span className="ml-2 text-sm font-normal text-slate-500">
            ({issues.length})
          </span>
        </h1>
      </div>

      {issues.length === 0 ? (
        <div className="text-center py-16 text-slate-400 border border-dashed border-slate-300 rounded-lg text-sm">
          No issues yet. Review a sample and use &ldquo;Promote to Issue&rdquo; to create one.
        </div>
      ) : (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="grid grid-cols-[2fr_1fr_1fr_120px] gap-4 px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500">
            <span>Title</span>
            <span>Status</span>
            <span>Samples</span>
            <span>Created</span>
          </div>
          {issues.map((issue) => (
            <div
              key={issue.id}
              className="grid grid-cols-[2fr_1fr_1fr_120px] gap-4 px-4 py-3 border-b border-slate-100 last:border-0 text-sm hover:bg-slate-50"
            >
              <span className="text-slate-800 font-medium">{issue.title}</span>
              <span>
                <Badge
                  variant={
                    issue.status === "open"
                      ? "destructive"
                      : issue.status === "resolved"
                      ? "success"
                      : "outline"
                  }
                >
                  {issue.status}
                </Badge>
              </span>
              <span className="text-slate-500 text-xs">
                {issue.sampleIds.length} sample(s)
              </span>
              <span className="text-slate-400 text-xs">
                {new Date(issue.createdAt).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
