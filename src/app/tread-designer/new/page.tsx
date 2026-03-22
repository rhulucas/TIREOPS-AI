"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, Save, ArrowLeft } from "lucide-react";
import { safeJson } from "@/lib/safe-json";

const CATEGORIES = ["PCR", "SUV", "TBR", "OTR", "AGR", "MCR"] as const;
const SEASONS = ["ALL_SEASON", "SUMMER", "WINTER", "PERFORMANCE", "OFF_ROAD"] as const;
const SEASON_LABELS: Record<string, string> = {
  ALL_SEASON: "All Season", SUMMER: "Summer", WINTER: "Winter",
  PERFORMANCE: "Performance", OFF_ROAD: "Off-Road",
};
const RATINGS = ["A", "B", "C", "D", "E"] as const;

export default function NewTreadDesignPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "", category: "PCR", season: "ALL_SEASON", status: "DRAFT",
    widthMm: "225", heightMm: "65", grooveDepthMm: "",
    noiseRating: "", wetGripRating: "", rollingResistance: "",
    notes: "", moldSpec: "",
  });
  const [recommendation, setRecommendation] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);
  const [saving, setSaving] = useState(false);
  const [basedOn, setBasedOn] = useState<number | null>(null);

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const getRecommendation = async () => {
    setLoadingAI(true);
    setRecommendation("");
    try {
      const res = await fetch("/api/tread-designs/ai-recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: form.category,
          season: form.season,
          widthMm: Number(form.widthMm) || 225,
          heightMm: Number(form.heightMm) || 65,
        }),
      });
      const data = await safeJson<{ recommendation?: string; basedOn?: number }>(res);
      setRecommendation(data.recommendation ?? "No recommendation.");
      setBasedOn(data.basedOn ?? null);
    } catch {
      setRecommendation("Failed to get AI recommendation.");
    } finally {
      setLoadingAI(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/tread-designs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          widthMm: Number(form.widthMm) || null,
          heightMm: Number(form.heightMm) || null,
          grooveDepthMm: form.grooveDepthMm ? Number(form.grooveDepthMm) : null,
        }),
      });
      const data = await safeJson<{ design?: { id: string } }>(res);
      if (data.design?.id) {
        router.push(`/tread-designer/${data.design.id}`);
      }
    } catch {
      alert("Failed to save design.");
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "form-input w-full rounded-[7px] border border-[var(--border2)] bg-[var(--bg)] px-3 py-2 text-[13px] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none";
  const labelClass = "form-label mb-1.5 block text-xs font-semibold text-[var(--text-mid)]";

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="tool-btn p-1.5">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-base font-bold text-[var(--text)]">New Tread Design</h1>
          <p className="text-xs text-[var(--text-dim)]">Fill in the specs, then get AI recommendations from the library</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Left: Form */}
        <div className="card space-y-4">
          <div className="text-sm font-bold text-[var(--text)]">Design Specifications</div>

          <div>
            <label className={labelClass}>Design Name</label>
            <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. PCR-Winter-v3" className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Category</label>
              <select value={form.category} onChange={(e) => set("category", e.target.value)} className={inputClass}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Season / Application</label>
              <select value={form.season} onChange={(e) => set("season", e.target.value)} className={inputClass}>
                {SEASONS.map((s) => <option key={s} value={s}>{SEASON_LABELS[s]}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Width (mm)</label>
              <input type="number" value={form.widthMm} onChange={(e) => set("widthMm", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Height (mm)</label>
              <input type="number" value={form.heightMm} onChange={(e) => set("heightMm", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Groove Depth (mm)</label>
              <input type="number" step="0.5" value={form.grooveDepthMm} onChange={(e) => set("grooveDepthMm", e.target.value)}
                placeholder="e.g. 8.5" className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Noise Rating</label>
              <select value={form.noiseRating} onChange={(e) => set("noiseRating", e.target.value)} className={inputClass}>
                <option value="">—</option>
                {RATINGS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Wet Grip</label>
              <select value={form.wetGripRating} onChange={(e) => set("wetGripRating", e.target.value)} className={inputClass}>
                <option value="">—</option>
                {RATINGS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Rolling Resistance</label>
              <select value={form.rollingResistance} onChange={(e) => set("rollingResistance", e.target.value)} className={inputClass}>
                <option value="">—</option>
                {RATINGS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Status</label>
            <select value={form.status} onChange={(e) => set("status", e.target.value)} className={inputClass}>
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Engineer Notes</label>
            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)}
              rows={3} placeholder="Design intent, test requirements, constraints..." className={inputClass} />
          </div>

          <button onClick={save} disabled={saving}
            className="w-full inline-flex items-center justify-center gap-2 rounded-[7px] border border-[var(--accent)] bg-[var(--accent)] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#1860c4] disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Design
          </button>
        </div>

        {/* Right: AI Recommendation */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold text-[var(--text)]">AI Recommendation</div>
            <button onClick={getRecommendation} disabled={loadingAI}
              className="inline-flex items-center gap-1.5 rounded-[7px] border border-[#7c3aed] bg-[#7c3aed] px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-[#6d28d9] disabled:opacity-50">
              {loadingAI ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {loadingAI ? "Analyzing..." : "Get Recommendation"}
            </button>
          </div>

          <p className="text-xs text-[var(--text-dim)]">
            AI will analyze similar designs in the library and recommend optimal parameters for your selected category and season.
          </p>

          <div className="ai-output-box min-h-[200px] max-h-[400px] overflow-y-auto">
            {loadingAI ? (
              <span className="text-[var(--accent)]">Querying design library and generating recommendation...</span>
            ) : recommendation ? (
              <div>
                {basedOn != null && (
                  <div className="mb-2 text-[10px] text-[var(--text-dim)]">Based on {basedOn} similar designs in library</div>
                )}
                <span className="whitespace-pre-wrap">{recommendation}</span>
              </div>
            ) : (
              <span className="text-[var(--text-dim)]">
                Select category and season, then click &ldquo;Get Recommendation&rdquo; to see AI-suggested parameters based on your existing design library.
              </span>
            )}
          </div>

          <div className="rounded-lg bg-[var(--bg2)] border border-[var(--border)] p-3 text-[11px] text-[var(--text-dim)] space-y-1">
            <div className="font-semibold text-[var(--text-mid)] mb-1">How it works</div>
            <div>1. Queries all active designs matching your category + season</div>
            <div>2. Computes averages and identifies best-performing patterns</div>
            <div>3. AI generates targeted recommendations with reasoning</div>
          </div>
        </div>
      </div>
    </div>
  );
}
