import { NextResponse } from "next/server";
import { getStore } from "@/lib/db";
import { buildEvidenceBundle, signBundle } from "@compliance-evals/core";

export async function POST(req: Request) {
  try {
    const { actor } = (await req.json()) as { actor?: string };
    const store = getStore();
    const { valid } = store.verifyChain();

    const bundle = buildEvidenceBundle({
      exportedBy: actor ?? "anonymous",
      samples: store.listSamples(),
      results: store.listResults(),
      auditRecords: store.listAuditRecords(),
      issues: store.listIssues(),
      chainValid: valid,
    });

    const signed = signBundle(bundle);
    return NextResponse.json(signed);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
