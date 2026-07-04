import { NextResponse } from "next/server";
import { getStore } from "@/lib/db";

export function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const store = getStore();
    const sample = store.getSample(params.id);
    if (!sample) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const results = store.listResults(params.id);
    return NextResponse.json({ sample, results });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
