import { notFound } from "next/navigation";
import { getStore } from "@/lib/db";
import { SampleDetailClient } from "@/components/sample-detail-client";

export const dynamic = "force-dynamic";

export default async function SamplePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const store = getStore();
  const sample = store.getSample(id);
  if (!sample) notFound();
  const results = store.listResults(id);
  return <SampleDetailClient sample={sample} results={results} />;
}
