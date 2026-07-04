import { NextResponse } from "next/server";
import { getStore } from "@/lib/db";

export function GET() {
  try {
    const store = getStore();
    const samples = store.listSamples();
    return NextResponse.json(samples);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
