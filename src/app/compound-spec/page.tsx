"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Search, Sparkles, FlaskConical } from "lucide-react";
import { safeJson } from "@/lib/safe-json";
import { useVirtualizer } from "@tanstack/react-virtual";

const APPLICATIONS = [
  "Passenger - Standard Touring",
  "Passenger - All Season",
  "Passenger - Winter",
  "SUV / Light Truck",
  "Commercial Truck",
  "OTR / Industrial",
  "UHP / Performance",
];
const POLYMERS = [
  "SBR (Styrene-Butadiene)",
  "NR (Natural Rubber)",
  "BR (Polybutadiene)",
  "IR (Polyisoprene)",
  "EPDM",
];
const FILLERS = [
  "Carbon Black N330",
  "Carbon Black N550",
  "Silica",
  "Calcium Carbonate",
  "Carbon Black N660",
];
const CURING = [
  "Sulfur - Conventional",
  "Sulfur - EV",
  "Peroxide",
  "Resin",
];

type Spec = {
  id: string;
  applicationType: string;
  primaryPolymer: string;
  fillerSystem: string;
  shoreA: string | null;
  tensileStrength: string | null;
  curingSystem: string;
  cureTemp: string | null;
  notes: string | null;
  result: string | null;
  createdAt: string;
  user: { name: string | null } | null;
};

export default function CompoundSpecPage() {
  const [tab, setTab] = useState<"generate" | "library">("generate");

  // ── Generator state ────────────────────────────────────────────
  const [appType, setAppType] = useState(APPLICATIONS[0]!);
  const [polymer, setPolymer] = useState(POLYMERS[0]!);
  const [filler, setFiller] = useState(FILLERS[0]!);
  const [shoreA, setShoreA] = useState("");
  const [tensile, setTensile] = useState("");
  const [curing, setCuring] = useState(CURING[0]!);
  const [cureTemp, setCureTemp] = useState("");
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  // AI recommendation
  const [recommendation, setRecommendation] = useState("");
  const [loadingRec, setLoadingRec] = useState(false);

  // ── Library state ──────────────────────────────────────────────
  const [specs, setSpecs] = useState<Spec[]>([]);
  const [libLoading, setLibLoading] = useState(false);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [filterApp, setFilterApp] = useState("");
  const [filterPolymer, setFilterPolymer] = useState("");
  const [selectedSpec, setSelectedSpec] = useState<Spec | null>(null);

  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (tab !== "library") return;
    let cancelled = false;
    const load = async () => {
      setLibLoading(true);
      const params = new URLSearchParams();
      if (debouncedQ) params.set("q", debouncedQ);
      if (filterApp) params.set("appType", filterApp);
      if (filterPolymer) params.set("polymer", filterPolymer);
      const res = await fetch(`/api/compound-specs?${params}`);
      const data = await safeJson<{ specs?: Spec[] }>(res);
      if (!cancelled) { setSpecs(data.specs ?? []); setLibLoading(false); }
    };
    load();
    return () => { cancelled = true; };
  }, [tab, debouncedQ, filterApp, filterPolymer]);

  const rowVirtualizer = useVirtualizer({
    count: specs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 41,
    overscan: 10,
  });

  const handleGenerate = async () => {
    setGenerating(true);
    setResult(null);
    try {
      const res = await fetch("/api/compound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationType: appType, primaryPolymer: polymer, fillerSystem: filler, shoreA, tensileStrength: tensile, curingSystem: curing, cureTemp, notes }),
      });
      const data = await safeJson<{ result?: string; error?: string }>(res);
      setResult(data.result || data.error || "Failed");
    } catch {
      setResult("API failed. Configure OPENAI_API_KEY.");
    } finally {
      setGenerating(false);
    }
  };

  const getRecommendation = async () => {
    setLoadingRec(true);
    setRecommendation("");
    try {
      const res = await fetch("/api/compound-specs/ai-recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appType, polymer, filler, curing }),
      });
      const data = await safeJson<{ recommendation?: string; error?: string }>(res);
      setRecommendation(data.recommendation ?? data.error ?? "No recommendation.");
    } catch {
      setRecommendation("Failed to get recommendation.");
    } finally {
      setLoadingRec(false);
    }
  };

  const inputClass = "form-input w-full rounded-[7px] border border-[var(--border2)] bg-[var(--bg)] px-3 py-2 text-[13px] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none";
  const labelClass = "mb-1.5 block text-xs font-semibold text-[var(--text-mid)]";

  // Column definitions for library table
  const cols = [
    { label: "Application", pct: "24%" },
    { label: "Polymer",     pct: "10%" },
    { label: "Filler",      pct: "18%" },
    { label: "Shore A",     pct: "9%"  },
    { label: "Tensile",     pct: "9%"  },
    { label: "Curing",      pct: "18%" },
    { label: "Date",        pct: "12%" },
  ];
  const colgroup = (
    <colgroup>
      {cols.map((c) => <col key={c.label} style={{ width: c.pct }} />)}
    </colgroup>
  );

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-[var(--border)]">
        <button
          onClick={() => setTab("generate")}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-semibold border-b-2 transition-colors ${tab === "generate" ? "border-[var(--accent)] text-[var(--accent)]" : "border-transparent text-[var(--text-mid)] hover:text-[var(--text)]"}`}
        >
          <Sparkles className="h-3.5 w-3.5" /> Generate
        </button>
        <button
          onClick={() => setTab("library")}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-semibold border-b-2 transition-colors ${tab === "library" ? "border-[var(--accent)] text-[var(--accent)]" : "border-transparent text-[var(--text-mid)] hover:text-[var(--text)]"}`}
        >
          <FlaskConical className="h-3.5 w-3.5" /> Formulation Library
          {specs.length > 0 && tab === "library" && (
            <span className="ml-1 rounded-full bg-[var(--accent-light)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--accent)]">{specs.length}</span>
          )}
        </button>
      </div>

      {/* ── Generate tab ── */}
      {tab === "generate" && (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Form */}
          <div className="card space-y-3.5">
            <div className="text-sm font-bold text-[var(--text)]">Rubber Compound Formulation</div>

            <div>
              <label className={labelClass}>Application Type</label>
              <select value={appType} onChange={(e) => setAppType(e.target.value)} className={inputClass}>
                {APPLICATIONS.map((a) => <option key={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Primary Polymer</label>
              <select value={polymer} onChange={(e) => setPolymer(e.target.value)} className={inputClass}>
                {POLYMERS.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Filler System</label>
              <select value={filler} onChange={(e) => setFiller(e.target.value)} className={inputClass}>
                {FILLERS.map((f) => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Shore A Hardness</label>
                <input type="text" value={shoreA} onChange={(e) => setShoreA(e.target.value)} placeholder="e.g. 60-65" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Tensile Strength (MPa)</label>
                <input type="text" value={tensile} onChange={(e) => setTensile(e.target.value)} placeholder="e.g. 18-22" className={inputClass} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Curing System</label>
                <select value={curing} onChange={(e) => setCuring(e.target.value)} className={inputClass}>
                  {CURING.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Cure Temperature (°C)</label>
                <input type="text" value={cureTemp} onChange={(e) => setCureTemp(e.target.value)} placeholder="e.g. 160-180" className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Performance Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
                placeholder="e.g. EU label wet grip A required, minimize rolling resistance for EV..." className={inputClass} />
            </div>
            <button onClick={handleGenerate} disabled={generating}
              className="w-full inline-flex items-center justify-center gap-2 rounded-[7px] bg-[var(--accent)] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#1860c4] disabled:opacity-50">
              {generating ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</> : "Generate AI Compound Spec"}
            </button>
          </div>

          {/* AI Output + Recommendation */}
          <div className="space-y-4">
            {/* AI Recommendation from library */}
            <div className="card space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold text-[var(--text)]">AI Recommendation</div>
                <button onClick={getRecommendation} disabled={loadingRec}
                  className="inline-flex items-center gap-1.5 rounded-[7px] border border-[#7c3aed] bg-[#7c3aed] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#6d28d9] disabled:opacity-50">
                  {loadingRec ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  From Library
                </button>
              </div>
              <div className="ai-output-box min-h-[80px]">
                {loadingRec ? (
                  <span className="text-[var(--accent)]">Querying formulation library...</span>
                ) : recommendation ? (
                  <span className="whitespace-pre-wrap text-[12px]">{recommendation}</span>
                ) : (
                  <span className="text-[var(--text-dim)] text-[12px]">Select application + polymer, then click &ldquo;From Library&rdquo; to get AI suggestions based on existing formulations.</span>
                )}
              </div>
            </div>

            {/* Generated spec output */}
            <div className="card">
              <div className="mb-3 text-sm font-bold text-[var(--text)]">Generated Formulation</div>
              {generating ? (
                <div className="ai-output-box min-h-[280px] flex items-start gap-1.5 text-[var(--accent)]">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--accent)] mt-1" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--accent)] mt-1 [animation-delay:0.2s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--accent)] mt-1 [animation-delay:0.4s]" />
                  &nbsp; Generating...
                </div>
              ) : (
                <textarea
                  value={result ?? ""}
                  onChange={(e) => setResult(e.target.value || null)}
                  placeholder="Fill in the parameters and click Generate to receive a full formulation with phr ratios, cure conditions, and EU label grades."
                  rows={14}
                  className="w-full rounded-[8px] border border-[var(--border)] bg-[#fafbfc] px-4 py-3 font-mono text-[12px] leading-[1.85] text-[var(--text)] placeholder:text-[var(--text-dim)] focus:border-[var(--accent)] focus:outline-none resize-none"
                />
              )}
              {result && (
                <div className="mt-3 flex gap-2">
                  <button onClick={() => navigator.clipboard.writeText(result)}
                    className="tool-btn text-[12px]">Copy Spec</button>
                  <button onClick={() => setResult(null)} className="tool-btn text-[12px]">Clear</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Library tab ── */}
      {tab === "library" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="card">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-dim)]" />
                <input type="text" value={q} onChange={(e) => setQ(e.target.value)}
                  placeholder="Search formulations..." className={`${inputClass} pl-8`} />
              </div>
              <select value={filterApp} onChange={(e) => setFilterApp(e.target.value)} className={inputClass} style={{ width: "auto" }}>
                <option value="">All Applications</option>
                {APPLICATIONS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
              <select value={filterPolymer} onChange={(e) => setFilterPolymer(e.target.value)} className={inputClass} style={{ width: "auto" }}>
                <option value="">All Polymers</option>
                {POLYMERS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <span className="ml-auto text-xs text-[var(--text-dim)]">{specs.length} formulations</span>
            </div>
          </div>

          {/* Virtual scroll table */}
          <div className="card p-0 overflow-hidden" style={{ overflowX: "hidden" }}>
            <div className="border-b border-[var(--border)] bg-[var(--bg2)]">
              <table style={{ tableLayout: "fixed", width: "100%" }} className="text-[13px]">
                {colgroup}
                <thead>
                  <tr>
                    {cols.map((c) => (
                      <th key={c.label} className="px-3 py-2.5 text-left text-[11px] font-semibold text-[var(--text-mid)]">{c.label}</th>
                    ))}
                  </tr>
                </thead>
              </table>
            </div>

            {libLoading ? (
              <div className="py-16 text-center text-sm text-[var(--text-dim)]">Loading...</div>
            ) : specs.length === 0 ? (
              <div className="py-16 text-center text-sm text-[var(--text-dim)]">No formulations found.</div>
            ) : (
              <div ref={parentRef} className="overflow-y-auto" style={{ height: "calc(100vh - 300px)" }}>
                <div style={{ height: rowVirtualizer.getTotalSize(), position: "relative" }}>
                  {rowVirtualizer.getVirtualItems().map((vRow) => {
                    const s = specs[vRow.index]!;
                    return (
                      <div
                        key={s.id}
                        data-index={vRow.index}
                        ref={rowVirtualizer.measureElement}
                        style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${vRow.start}px)` }}
                      >
                        <table style={{ tableLayout: "fixed", width: "100%" }} className="text-[13px]">
                          {colgroup}
                          <tbody>
                            <tr
                              onClick={() => setSelectedSpec(selectedSpec?.id === s.id ? null : s)}
                              className="border-b border-[var(--border)] hover:bg-[var(--accent-light)] cursor-pointer transition-colors"
                            >
                              <td className="px-3 py-2 text-[var(--text)] truncate">{s.applicationType}</td>
                              <td className="px-3 py-2 truncate"><span className="badge-blue text-[10px]">{s.primaryPolymer.split(" ")[0]}</span></td>
                              <td className="px-3 py-2 text-[var(--text-dim)] truncate">{s.fillerSystem}</td>
                              <td className="px-3 py-2 text-[var(--text-mid)]">{s.shoreA ?? "—"}</td>
                              <td className="px-3 py-2 text-[var(--text-mid)]">{s.tensileStrength ? `${s.tensileStrength}` : "—"}</td>
                              <td className="px-3 py-2 text-[var(--text-dim)] truncate">{s.curingSystem}</td>
                              <td className="px-3 py-2 text-[11px] text-[var(--text-dim)]">{new Date(s.createdAt).toLocaleDateString()}</td>
                            </tr>
                          </tbody>
                        </table>
                        {/* Inline expanded view */}
                        {selectedSpec?.id === s.id && s.result && (
                          <div className="border-b border-[var(--border)] bg-[var(--bg2)] px-4 py-3">
                            <div className="flex items-start justify-between gap-4">
                              <pre className="whitespace-pre-wrap text-[12px] text-[var(--text)] font-mono flex-1">{s.result}</pre>
                              <div className="flex flex-col gap-2 shrink-0">
                                <button onClick={() => navigator.clipboard.writeText(s.result!)} className="tool-btn text-[11px]">Copy</button>
                                <button onClick={() => { setTab("generate"); setAppType(s.applicationType); setPolymer(s.primaryPolymer); setFiller(s.fillerSystem); setCuring(s.curingSystem); setResult(s.result); }}
                                  className="tool-btn text-[11px]">Load</button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
