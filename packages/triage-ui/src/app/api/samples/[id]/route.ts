import { NextResponse } from "next/server";
import { getStore } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const store = getStore();
    const sample = store.getSample(id);
    if (!sample) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const results = store.listResults(id);
    return NextResponse.json({ sample, results });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
