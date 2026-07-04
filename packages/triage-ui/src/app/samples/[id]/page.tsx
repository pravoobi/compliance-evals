import { notFound } from "next/navigation";
import { getStore } from "@/lib/db";
import { SampleDetailClient } from "@/components/sample-detail-client";

export const dynamic = "force-dynamic";

export default function SamplePage({ params }: { params: { id: string } }) {
  const store = getStore();
  const sample = store.getSample(params.id);
  if (!sample) notFound();
  const results = store.listResults(params.id);
  return <SampleDetailClient sample={sample} results={results} />;
}
