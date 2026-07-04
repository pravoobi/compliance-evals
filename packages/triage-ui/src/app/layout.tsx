import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Compliance Triage",
  description: "Human review and annotation for LLM compliance evaluations",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded"
        >
          Skip to main content
        </a>
        <header className="border-b border-slate-200 bg-white px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-900">Compliance Triage</span>
            <span className="text-xs text-slate-400 border border-slate-200 rounded px-1.5 py-0.5">
              v0.1
            </span>
          </div>
          <nav className="flex gap-4 text-sm">
            <a href="/" className="text-slate-600 hover:text-slate-900">
              Samples
            </a>
            <a href="/issues" className="text-slate-600 hover:text-slate-900">
              Issues
            </a>
          </nav>
        </header>
        <main id="main-content" className="max-w-7xl mx-auto px-6 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
