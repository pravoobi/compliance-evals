import { NextResponse } from "next/server";
import { getStore } from "@/lib/db";
import { SEED_SAMPLES } from "@/lib/seed";
import { runEvalsForSample } from "@/lib/run-evals";

export async function POST() {
  try {
    const store = getStore();
    const existing = store.listSamples();
    if (existing.length > 0) {
      return NextResponse.json({ message: "Already seeded", count: existing.length });
    }
    for (const sample of SEED_SAMPLES) {
      store.saveSample(sample);
      await runEvalsForSample(store, sample);
    }
    return NextResponse.json({ message: "Seeded", count: SEED_SAMPLES.length });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
