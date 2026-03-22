"use client";

import Link from "next/link";

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent)] text-lg text-white">
            🛞
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-[var(--text)]">
              TireOps AI
            </span>
            <span className="ml-1.5 hidden text-sm text-[var(--text-dim)] sm:inline">
              Manufacturing Platform
            </span>
          </div>
        </Link>
      </div>
    </header>
  );
}
