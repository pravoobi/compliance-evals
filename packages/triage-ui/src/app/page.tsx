import { getStore } from "@/lib/db";
import { SampleListClient } from "@/components/sample-list-client";
import { SeedButton } from "@/components/seed-button";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const store = getStore();
  const samples = store.listSamples();
  const allResults = store.listResults();

  const rows = samples.map((s) => ({
    sample: s,
    results: allResults.filter((r) => r.sampleId === s.id),
  }));

  const failCount = rows.filter((r) =>
    r.results.some((res) => res.verdict === "fail")
  ).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Flagged Samples</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {samples.length} total · {failCount} failing
          </p>
        </div>
        {samples.length === 0 && <SeedButton />}
      </div>
      {samples.length === 0 ? (
        <div className="text-center py-16 text-slate-400 border border-dashed border-slate-300 rounded-lg">
          <p className="text-sm">No samples yet. Click &ldquo;Seed demo data&rdquo; to load 30 synthetic fintech samples.</p>
        </div>
      ) : (
        <SampleListClient rows={rows} />
      )}
    </div>
  );
}
