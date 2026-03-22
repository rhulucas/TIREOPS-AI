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
  Sparkles,
  BarChart3,
  Users,
  Layers,
} from "lucide-react";
import { LandingHeader } from "@/components/LandingHeader";
import { LandingFooter } from "@/components/LandingFooter";

const stats = [
  { icon: BarChart3, value: "290+", label: "Active Orders" },
  { icon: Users, value: "100+", label: "Customers" },
  { icon: Layers, value: "12", label: "Production Lines" },
  { icon: Sparkles, value: "6", label: "AI Modules" },
];

const featuredFeatures = [
  {
    icon: FileText,
    title: "AI Sales Quote Assistant",
    desc: "Generate precise tire pricing with customer history, risk flags, win probability scoring, and smart negotiation guidance — all powered by GPT.",
    badge: "AI Powered",
    color: "from-blue-600 to-blue-800",
    iconBg: "bg-blue-500/20 text-blue-300",
  },
  {
    icon: PencilRuler,
    title: "Tread Designer",
    desc: "Design tread patterns with AI analysis, EU rating prediction, and direct mold CNC export with a full change-request workflow.",
    badge: "AI Powered",
    color: "from-indigo-600 to-indigo-800",
    iconBg: "bg-indigo-500/20 text-indigo-300",
  },
];

const features = [
  {
    icon: ShoppingCart,
    title: "Order Management",
    desc: "Production queue, status tracking, and priority management across all lines.",
  },
  {
    icon: Mail,
    title: "Email AI",
    desc: "Smart customer email drafts for quotes, invoices, delays, and reorder reminders.",
  },
  {
    icon: Receipt,
    title: "Invoice AI",
    desc: "Auto-generate invoices with custom payment terms and tax rates.",
  },
  {
    icon: FlaskConical,
    title: "Compound Spec",
    desc: "Rubber formulation with phr ratios, shore A specs, and EU label prediction.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <LandingHeader showSignIn />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e3a8a] to-[#0f172a]">
        {/* Background grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        {/* Glow blobs */}
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-indigo-500/15 blur-3xl" />

        <div className="relative mx-auto max-w-5xl px-6 py-24 sm:py-32 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-4 py-1.5 text-sm font-medium text-blue-300">
            <Sparkles className="h-3.5 w-3.5" />
            Internal Operations Platform
          </div>

          <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl">
            TireOps{" "}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              AI
            </span>
          </h1>
          <p className="mt-4 text-xl text-blue-200/80 font-medium">
            Manufacturing Platform
          </p>
          <p className="mt-6 mx-auto max-w-2xl text-base leading-relaxed text-slate-300/80">
            AI-powered operations for tire manufacturing — quoting, order management,
            customer communications, invoice generation, tread design, and compound
            formulation. All in one platform.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login?callbackUrl=/dashboard"
              className="inline-flex items-center gap-2.5 rounded-xl bg-white px-8 py-4 text-base font-semibold text-[#1e3a8a] shadow-xl shadow-blue-900/40 transition-all hover:bg-blue-50 hover:-translate-y-0.5 hover:shadow-2xl"
            >
              Sign In to Dashboard
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.label}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-5 backdrop-blur-sm"
                >
                  <Icon className="mx-auto h-5 w-5 text-blue-400 mb-2" />
                  <div className="text-3xl font-bold text-white">{s.value}</div>
                  <div className="mt-0.5 text-sm text-slate-400">{s.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Featured AI Modules ── */}
      <section className="bg-[#0d1424] py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400 uppercase tracking-wide">
              <Sparkles className="h-3 w-3" /> AI Core Features
            </span>
            <h2 className="mt-4 text-3xl font-bold text-white sm:text-4xl">
              Intelligent Manufacturing, Simplified
            </h2>
            <p className="mt-3 text-slate-400 max-w-xl mx-auto">
              GPT-powered modules that handle complex decisions so your team can focus on production.
            </p>
          </div>

          {/* Featured 2-col cards */}
          <div className="grid gap-6 sm:grid-cols-2">
            {featuredFeatures.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${f.color} p-7 text-white shadow-xl`}
                >
                  <div className="absolute top-0 right-0 h-48 w-48 -translate-y-12 translate-x-12 rounded-full bg-white/5 blur-2xl" />
                  <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${f.iconBg}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="mt-4 inline-block rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold tracking-wide">
                    {f.badge}
                  </span>
                  <h3 className="mt-3 text-xl font-bold">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/75">{f.desc}</p>
                </div>
              );
            })}
          </div>

          {/* Regular 4-col cards */}
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="group rounded-xl border border-white/8 bg-white/5 p-5 backdrop-blur-sm transition-all hover:border-blue-500/40 hover:bg-white/8 hover:-translate-y-0.5"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/15 text-blue-400 transition-colors group-hover:bg-blue-500/25">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-white">
                    {f.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">
                    {f.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#1e3a8a] to-[#0f172a] py-20">
        <div className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Ready to run smarter operations?
          </h2>
          <p className="mt-4 text-blue-200/70 text-base max-w-xl mx-auto">
            Sign in to access the full dashboard, real-time production data, AI modules, and your team's workflow tools.
          </p>
          <Link
            href="/login?callbackUrl=/dashboard"
            className="mt-8 inline-flex items-center gap-2.5 rounded-xl bg-white px-8 py-4 text-base font-semibold text-[#1e3a8a] shadow-xl shadow-blue-900/40 transition-all hover:bg-blue-50 hover:-translate-y-0.5 hover:shadow-2xl"
          >
            Sign In to Dashboard
            <ArrowRight className="h-5 w-5" />
          </Link>
          <p className="mt-4 text-xs text-blue-300/40">
            Authorized employees only · Internal use
          </p>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
