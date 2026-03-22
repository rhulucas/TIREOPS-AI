"use client";

import Link from "next/link";
import {
  FileText,
  ShoppingCart,
  Mail,
  Receipt,
  PencilRuler,
  FlaskConical,
  ArrowRight,
} from "lucide-react";
import { LandingHeader } from "@/components/LandingHeader";
import { LandingFooter } from "@/components/LandingFooter";

const features = [
  {
    icon: FileText,
    title: "Sales Quote Assistant",
    desc: "Sales-focused tire pricing, history, risks, and quote guidance",
  },
  {
    icon: ShoppingCart,
    title: "Order Management",
    desc: "Production queue, status tracking, and priority management",
  },
  {
    icon: Mail,
    title: "Email AI",
    desc: "Smart customer email replies for multiple scenarios and tones",
  },
  {
    icon: Receipt,
    title: "Invoice AI",
    desc: "Auto-generate invoices with custom terms and tax rates",
  },
  {
    icon: PencilRuler,
    title: "Tread Designer",
    desc: "Tread pattern design, AI analysis, and mold CNC export",
  },
  {
    icon: FlaskConical,
    title: "Compound Spec",
    desc: "Rubber formulation with phr ratios and EU label prediction",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <LandingHeader />
      <main
        className="flex-1"
        style={{
          backgroundImage: "url('/landing-bg.svg')",
          backgroundSize: "cover",
          backgroundAttachment: "fixed",
        }}
      >
      <div className="mx-auto max-w-5xl px-6 py-16 sm:py-24">
        <div className="flex flex-col items-center text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent)] text-3xl text-white shadow-lg shadow-[var(--accent)]/25">
            🛞
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-[var(--text)] sm:text-5xl">
            TireOps AI
          </h1>
          <p className="mt-2 text-lg text-[var(--text-mid)]">
            Manufacturing Platform
          </p>
          <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-[var(--text-dim)]">
            Our internal operations platform for tire manufacturing: AI quoting, order management, customer communications, invoice generation, tread design, and compound formulation. Sign in to access all features.
          </p>
          <Link
            href="/login?callbackUrl=/dashboard"
            className="mt-10 inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-8 py-4 text-base font-semibold text-white shadow-lg shadow-[var(--accent)]/30 transition-all hover:bg-[#1860c4] hover:shadow-xl hover:shadow-[var(--accent)]/35 hover:-translate-y-0.5"
          >
            Sign In
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>

        <div className="mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="rounded-xl border border-[var(--border)] bg-white/90 p-6 shadow-md backdrop-blur-sm transition-all hover:border-[var(--accent)]/50 hover:shadow-lg"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-light)] text-[var(--accent)]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-[var(--text)]">
                  {f.title}
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-[var(--text-dim)]">
                  {f.desc}
                </p>
              </div>
            );
          })}
        </div>

        <p className="mt-12 text-center text-[13px] text-[var(--text-light)]">
          Sign in to access the full dashboard, production data, and AI modules
        </p>

        <section className="mt-20 rounded-xl border border-[var(--border)] bg-white/90 p-8 text-left shadow-md backdrop-blur-sm">
          <h2 className="text-lg font-bold text-[var(--text)]">About TireOps</h2>
          <p className="mt-3 text-[14px] leading-relaxed text-[var(--text-dim)]">
            TireOps is a tire manufacturing company. This platform is our internal operations system for production, sales, and R&D. We use it for AI-powered quoting, order management, customer communications, tread design, and compound formulation. Authorized employees sign in to manage daily operations and maintain quality and compliance standards.
          </p>
        </section>
      </div>
      </main>
      <LandingFooter />
    </div>
  );
}
