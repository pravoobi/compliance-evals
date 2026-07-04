import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getStore } from "@/lib/db";
import { IssueSchema } from "@compliance-evals/types";
import { z } from "zod";

const CreateIssueBody = z.object({
  title: z.string().min(1),
  sampleIds: z.array(z.string().uuid()).min(1),
  evalCriteria: z
    .array(
      z.object({
        evaluatorId: z.string(),
        verdict: z.string(),
        description: z.string(),
      })
    )
    .default([]),
});

export function GET() {
  try {
    return NextResponse.json(getStore().listIssues());
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = CreateIssueBody.parse(await req.json());
    const now = new Date();
    const issue = IssueSchema.parse({
      id: randomUUID(),
      title: body.title,
      status: "open",
      sampleIds: body.sampleIds,
      evalCriteria: body.evalCriteria,
      createdAt: now,
      updatedAt: now,
    });
    getStore().saveIssue(issue);
    return NextResponse.json(issue, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}
