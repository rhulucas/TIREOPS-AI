"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function LandingHeader({ showSignIn }: { showSignIn?: boolean } = {}) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0f172a]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent)] text-lg text-white shadow-md">
            🛞
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-white">
              TireOps AI
            </span>
            <span className="ml-1.5 hidden text-sm text-slate-400 sm:inline">
              Manufacturing Platform
            </span>
          </div>
        </Link>

        {showSignIn && (
          <Link
            href="/login?callbackUrl=/dashboard"
            className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition-all hover:bg-white/20"
          >
            Sign In
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </header>
  );
}
