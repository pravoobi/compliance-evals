import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getStore } from "@/lib/db";
import { buildAuditRecord } from "@compliance-evals/core";
import { AuditActionSchema } from "@compliance-evals/types";
import { z } from "zod";

const ReviewBodySchema = z.object({
  resultId: z.string().uuid(),
  actor: z.string().min(1),
  action: AuditActionSchema,
  reason: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = ReviewBodySchema.parse(await req.json());
    const store = getStore();

    const result = store.getResult(body.resultId);
    if (!result) {
      return NextResponse.json({ error: "EvalResult not found" }, { status: 404 });
    }

    const prevHash = store.listAuditRecords().at(-1)?.hash ?? "";
    const record = buildAuditRecord(
      {
        resultId: body.resultId,
        actor: body.actor,
        action: body.action,
        reason: body.reason,
      },
      prevHash
    );
    store.appendAuditRecord(record);

    return NextResponse.json({ auditRecordId: record.id });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}
