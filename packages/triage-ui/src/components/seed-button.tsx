"use client";

import { useState } from "react";

export function SeedButton() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSeed() {
    setLoading(true);
    await fetch("/api/seed", { method: "POST" });
    setDone(true);
    window.location.reload();
  }

  return (
    <button
      onClick={handleSeed}
      disabled={loading || done}
      className="text-xs px-3 py-1.5 border border-slate-300 rounded hover:bg-slate-50 text-slate-700 disabled:opacity-50"
      aria-label="Seed demo data"
    >
      {loading ? "Seeding…" : "Seed demo data"}
    </button>
  );
}
