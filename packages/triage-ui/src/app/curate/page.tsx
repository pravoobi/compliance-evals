import { getStore } from "@/lib/db";
import { AutoCurator } from "@compliance-evals/core";
import { ClusterCard } from "@/components/cluster-card";

export const dynamic = "force-dynamic";

export default function CuratePage() {
  const store = getStore();
  const curator = new AutoCurator();
  const report = curator.run(store);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-slate-900">Auto-Curation</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Failure clusters suggested for promotion to tracked issues
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Failing samples", value: report.totalFailingSamples },
          { label: "Already promoted", value: report.alreadyPromoted },
          { label: "Suggested clusters", value: report.clusters.length },
        ].map(({ label, value }) => (
          <div key={label} className="border border-slate-200 rounded-lg px-4 py-3">
            <div className="text-xs text-slate-500 mb-1">{label}</div>
            <div className="text-2xl font-semibold text-slate-900">{value}</div>
          </div>
        ))}
      </div>

      {report.clusters.length === 0 ? (
        <div className="text-center py-16 text-slate-400 border border-dashed border-slate-300 rounded-lg text-sm">
          {report.totalFailingSamples === 0
            ? "No failing samples found. Run evaluations first."
            : "All failing samples are already tracked in issues."}
        </div>
      ) : (
        <div className="space-y-3">
          {report.clusters.map((cluster) => (
            <ClusterCard key={cluster.fingerprint} cluster={cluster} />
          ))}
        </div>
      )}
    </div>
  );
}
