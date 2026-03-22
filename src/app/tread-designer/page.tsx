"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Search, Plus, ChevronRight } from "lucide-react";
import { safeJson } from "@/lib/safe-json";
import { useVirtualizer } from "@tanstack/react-virtual";

const CATEGORIES = ["PCR", "SUV", "TBR", "OTR", "AGR", "MCR"] as const;
const SEASONS = ["ALL_SEASON", "SUMMER", "WINTER", "PERFORMANCE", "OFF_ROAD"] as const;
const SEASON_LABELS: Record<string, string> = {
  ALL_SEASON: "All Season", SUMMER: "Summer", WINTER: "Winter",
  PERFORMANCE: "Performance", OFF_ROAD: "Off-Road",
};
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "badge-green", DRAFT: "badge-amber", DISCONTINUED: "badge-neutral",
};
const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active", DRAFT: "Draft", DISCONTINUED: "Discontinued",
};

type Design = {
  id: string;
  name: string | null;
  category: string;
  season: string;
  status: string;
  version: number;
  widthMm: number | null;
  heightMm: number | null;
  grooveDepthMm: number | null;
  noiseRating: string | null;
  wetGripRating: string | null;
  rollingResistance: string | null;
  createdAt: string;
  _count: { changeRequests: number };
  user: { name: string | null } | null;
};

export default function TreadDesignerPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role;
  const isAdmin = role === "ADMIN";
  const isEngineer = role === "ENGINEER" || role === "ADMIN";

  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [category, setCategory] = useState("");
  const [season, setSeason] = useState("");
  const [status, setStatus] = useState("");

  // Debounce search input — wait 300ms after user stops typing
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const params = new URLSearchParams();
      if (debouncedQ) params.set("q", debouncedQ);
      if (category) params.set("category", category);
      if (season) params.set("season", season);
      if (status) params.set("status", status);
      const res = await fetch(`/api/tread-designs?${params}`);
      const data = await safeJson<{ designs?: Design[] }>(res);
      if (!cancelled) {
        setDesigns(data.designs ?? []);
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [debouncedQ, category, season, status]);

  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: designs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 41,
    overscan: 10,
  });

  const inputClass = "form-input w-auto rounded-[7px] border border-[var(--border2)] bg-[var(--bg)] px-3 py-1.5 text-[13px] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-[var(--text)]">Tread Design Library</h1>
          <p className="text-xs text-[var(--text-dim)] mt-0.5">Browse and manage tread pattern designs across all tire categories</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <button
              onClick={() => router.push("/tread-designer/change-requests")}
              className="tool-btn text-[13px]"
            >
              Change Requests
            </button>
          )}
          {isEngineer && (
            <button
              onClick={() => router.push("/tread-designer/new")}
              className="inline-flex items-center gap-1.5 rounded-[7px] border border-[var(--accent)] bg-[var(--accent)] px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-[#1860c4]"
            >
              <Plus className="h-3.5 w-3.5" /> New Design
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-dim)]" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search designs..."
              className={`${inputClass} pl-8 w-full`}
            />
          </div>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={season} onChange={(e) => setSeason(e.target.value)} className={inputClass}>
            <option value="">All Seasons</option>
            {SEASONS.map((s) => <option key={s} value={s}>{SEASON_LABELS[s]}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active only</option>
            <option value="DRAFT">Draft only</option>
            <option value="DISCONTINUED">Discontinued only</option>
          </select>
          <span className="text-xs text-[var(--text-dim)] ml-auto">{designs.length} designs</span>
        </div>
      </div>

      {/* Category quick-nav */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setCategory("")}
          className={`tool-btn text-xs ${category === "" ? "active" : ""}`}
        >All</button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(category === c ? "" : c)}
            className={`tool-btn text-xs ${category === c ? "active" : ""}`}
          >{c}</button>
        ))}
      </div>

      {/* Design table — virtual scroll */}
      {(() => {
        // Shared column definitions — same widths applied to both header and rows
        const cols = [
          { label: "Name",     pct: "18%" },
          { label: "Category", pct: "8%"  },
          { label: "Season",   pct: "11%" },
          { label: "Size",     pct: "10%" },
          { label: "Groove",   pct: "8%"  },
          { label: "Noise",    pct: "7%"  },
          { label: "Grip",     pct: "7%"  },
          { label: "RR",       pct: "6%"  },
          { label: "Status",   pct: "11%" },
          { label: "Date",     pct: "10%" },
          { label: "",         pct: "4%"  },
        ];
        const colgroup = (
          <colgroup>
            {cols.map((c) => <col key={c.label || "arrow"} style={{ width: c.pct }} />)}
          </colgroup>
        );

        return (
          <div className="card p-0 overflow-hidden">
            {/* Sticky header */}
            <div className="border-b border-[var(--border)] bg-[var(--bg2)]">
              <table style={{ tableLayout: "fixed", width: "100%" }} className="text-[13px]">
                {colgroup}
                <thead>
                  <tr>
                    {cols.map((c) => (
                      <th key={c.label || "arrow"} className="px-3 py-2.5 text-left text-[11px] font-semibold text-[var(--text-mid)] whitespace-nowrap overflow-hidden">
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
              </table>
            </div>

            {loading ? (
              <div className="py-16 text-center text-sm text-[var(--text-dim)]">Loading...</div>
            ) : designs.length === 0 ? (
              <div className="py-16 text-center text-sm text-[var(--text-dim)]">No designs found.</div>
            ) : (
              <div ref={parentRef} className="overflow-y-auto" style={{ height: "calc(100vh - 320px)" }}>
                <div style={{ height: rowVirtualizer.getTotalSize(), position: "relative" }}>
                  {rowVirtualizer.getVirtualItems().map((vRow) => {
                    const d = designs[vRow.index]!;
                    return (
                      <div
                        key={d.id}
                        data-index={vRow.index}
                        ref={rowVirtualizer.measureElement}
                        style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${vRow.start}px)` }}
                      >
                        <table style={{ tableLayout: "fixed", width: "100%" }} className="text-[13px]">
                          {colgroup}
                          <tbody>
                            <tr
                              onClick={() => router.push(`/tread-designer/${d.id}`)}
                              className="border-b border-[var(--border)] hover:bg-[var(--accent-light)] cursor-pointer transition-colors"
                            >
                              <td className="px-3 py-2 font-medium text-[var(--text)] truncate">
                                {d.name ?? "—"}
                                {d.version > 1 && <span className="ml-1 text-[10px] text-[var(--text-dim)]">v{d.version}</span>}
                              </td>
                              <td className="px-3 py-2"><span className="badge-blue text-[10px]">{d.category}</span></td>
                              <td className="px-3 py-2 text-[var(--text-mid)] truncate">{SEASON_LABELS[d.season] ?? d.season}</td>
                              <td className="px-3 py-2 text-[var(--text-dim)]">{d.widthMm ?? "—"}/{d.heightMm ?? "—"}mm</td>
                              <td className="px-3 py-2 text-[var(--text-dim)]">{d.grooveDepthMm != null ? `${d.grooveDepthMm}mm` : "—"}</td>
                              <td className="px-3 py-2 font-semibold text-[var(--text)]">{d.noiseRating ?? "—"}</td>
                              <td className="px-3 py-2 font-semibold text-[var(--text)]">{d.wetGripRating ?? "—"}</td>
                              <td className="px-3 py-2 font-semibold text-[var(--text)]">{d.rollingResistance ?? "—"}</td>
                              <td className="px-3 py-2">
                                <span className={`${STATUS_COLORS[d.status] ?? "badge-neutral"} text-[10px]`}>
                                  {STATUS_LABELS[d.status] ?? d.status}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-[11px] text-[var(--text-dim)]">
                                {new Date(d.createdAt).toLocaleDateString()}
                              </td>
                              <td className="px-3 py-2">
                                <ChevronRight className="h-3.5 w-3.5 text-[var(--text-dim)]" />
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
