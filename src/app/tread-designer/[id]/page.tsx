"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, Loader2, Send, CheckCircle, XCircle } from "lucide-react";
import { safeJson } from "@/lib/safe-json";

const SEASON_LABELS: Record<string, string> = {
  ALL_SEASON: "All Season", SUMMER: "Summer", WINTER: "Winter",
  PERFORMANCE: "Performance", OFF_ROAD: "Off-Road",
};
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "badge-green", DRAFT: "badge-amber", DISCONTINUED: "badge-neutral",
};
const CR_STATUS_COLORS: Record<string, string> = {
  PENDING: "badge-amber", APPROVED: "badge-green", REJECTED: "badge-red",
};

type ChangeRequest = {
  id: string;
  type: string;
  description: string;
  proposedChanges: string;
  status: string;
  reviewNote: string | null;
  aiAssessment: string | null;
  createdAt: string;
  requester: { name: string | null; email: string; role: string };
  reviewer: { name: string | null } | null;
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
  notes: string | null;
  moldSpec: string | null;
  createdAt: string;
  user: { name: string | null; email: string } | null;
  changeRequests: ChangeRequest[];
};

export default function TreadDesignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role;
  const isAdmin = role === "ADMIN";
  const isEngineer = role === "ENGINEER" || role === "ADMIN";

  const [design, setDesign] = useState<Design | null>(null);
  const [loading, setLoading] = useState(true);

  // Change request form
  const [crType, setCrType] = useState("UPDATE");
  const [crDesc, setCrDesc] = useState("");
  const [crChanges, setCrChanges] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showCrForm, setShowCrForm] = useState(false);

  // Review
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  const load = async () => {
    setLoading(true);
    const res = await fetch(`/api/tread-designs/${id}`);
    const data = await safeJson<{ design?: Design }>(res);
    setDesign(data.design ?? null);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const submitCR = async () => {
    if (!crDesc.trim()) return;
    setSubmitting(true);
    try {
      let proposed: unknown = {};
      try { proposed = crChanges ? JSON.parse(crChanges) : {}; } catch { proposed = { raw: crChanges }; }
      await fetch("/api/change-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ designId: id, type: crType, description: crDesc, proposedChanges: proposed }),
      });
      setCrDesc(""); setCrChanges(""); setShowCrForm(false);
      await load();
    } catch {
      alert("Failed to submit change request.");
    } finally {
      setSubmitting(false);
    }
  };

  const reviewCR = async (crId: string, status: "APPROVED" | "REJECTED") => {
    await fetch(`/api/change-requests/${crId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, reviewNote }),
    });
    setReviewingId(null);
    setReviewNote("");
    await load();
  };

  const inputClass = "form-input w-full rounded-[7px] border border-[var(--border2)] bg-[var(--bg)] px-3 py-2 text-[13px] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none";
  const labelClass = "mb-1 block text-xs font-semibold text-[var(--text-mid)]";

  if (loading) return <div className="py-20 text-center text-sm text-[var(--text-dim)]">Loading...</div>;
  if (!design) return <div className="py-20 text-center text-sm text-[var(--text-dim)]">Design not found.</div>;

  const pendingCRs = design.changeRequests.filter((c) => c.status === "PENDING");

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="tool-btn p-1.5">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base font-bold text-[var(--text)]">{design.name ?? "—"}</h1>
            {design.version > 1 && <span className="text-xs text-[var(--text-dim)]">v{design.version}</span>}
            <span className="badge-blue text-[10px]">{design.category}</span>
            <span className="badge-neutral text-[10px]">{SEASON_LABELS[design.season] ?? design.season}</span>
            <span className={`${STATUS_COLORS[design.status] ?? "badge-neutral"} text-[10px]`}>{design.status}</span>
            {pendingCRs.length > 0 && (
              <span className="badge-amber text-[10px]">{pendingCRs.length} pending CR</span>
            )}
          </div>
          <p className="text-xs text-[var(--text-dim)] mt-0.5">
            Created {new Date(design.createdAt).toLocaleDateString()} by {design.user?.name ?? "—"}
          </p>
        </div>
        {isEngineer && design.status !== "DISCONTINUED" && (
          <button onClick={() => setShowCrForm(!showCrForm)}
            className="inline-flex items-center gap-1.5 rounded-[7px] border border-[var(--accent)] bg-[var(--accent)] px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-[#1860c4]">
            Request Change
          </button>
        )}
      </div>

      {/* Specs */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <div className="mb-3 text-sm font-bold text-[var(--text)]">Technical Specifications</div>
          <div className="grid grid-cols-2 gap-y-2 text-[13px]">
            {[
              ["Category", design.category],
              ["Season", SEASON_LABELS[design.season] ?? design.season],
              ["Width", design.widthMm != null ? `${design.widthMm} mm` : "—"],
              ["Height", design.heightMm != null ? `${design.heightMm} mm` : "—"],
              ["Groove Depth", design.grooveDepthMm != null ? `${design.grooveDepthMm} mm` : "—"],
              ["Noise Rating (EU)", design.noiseRating ?? "—"],
              ["Wet Grip (EU)", design.wetGripRating ?? "—"],
              ["Rolling Resistance", design.rollingResistance ?? "—"],
            ].map(([label, val]) => (
              <div key={label}>
                <div className="text-[11px] text-[var(--text-dim)]">{label}</div>
                <div className="font-semibold text-[var(--text)]">{val}</div>
              </div>
            ))}
          </div>
          {design.notes && (
            <div className="mt-3 rounded-lg bg-[var(--bg2)] border border-[var(--border)] p-2.5 text-[12px] text-[var(--text-mid)]">
              {design.notes}
            </div>
          )}
        </div>

        {design.moldSpec && (
          <div className="card">
            <div className="mb-3 text-sm font-bold text-[var(--text)]">Mold CNC Specification</div>
            <pre className="code-output overflow-auto text-[11px]">{design.moldSpec}</pre>
          </div>
        )}
      </div>

      {/* Change request form */}
      {showCrForm && (
        <div className="card border-[var(--accent)]">
          <div className="mb-3 text-sm font-bold text-[var(--text)]">Submit Change Request</div>
          <div className="space-y-3">
            <div>
              <label className={labelClass}>Request Type</label>
              <select value={crType} onChange={(e) => setCrType(e.target.value)} className={inputClass}>
                <option value="UPDATE">UPDATE — Modify parameters</option>
                <option value="DEPRECATE">DEPRECATE — Mark as discontinued</option>
                <option value="NEW_VERSION">NEW_VERSION — Create new version</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Description <span className="text-[var(--accent)]">*</span></label>
              <textarea value={crDesc} onChange={(e) => setCrDesc(e.target.value)} rows={3}
                placeholder="Describe the change and the engineering reason..." className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Proposed Changes (JSON, optional)</label>
              <textarea value={crChanges} onChange={(e) => setCrChanges(e.target.value)} rows={2}
                placeholder={'{"grooveDepthMm": 9.5, "noiseRating": "A"}'} className={`${inputClass} font-mono text-[12px]`} />
              <p className="mt-1 text-[11px] text-[var(--text-dim)]">AI will assess your request based on historical data from the design library.</p>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowCrForm(false)} className="tool-btn">Cancel</button>
              <button onClick={submitCR} disabled={submitting || !crDesc.trim()}
                className="inline-flex items-center gap-1.5 rounded-[7px] border border-[var(--accent)] bg-[var(--accent)] px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-[#1860c4] disabled:opacity-50">
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                {submitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change requests history */}
      {design.changeRequests.length > 0 && (
        <div className="card">
          <div className="mb-3 text-sm font-bold text-[var(--text)]">Change Requests ({design.changeRequests.length})</div>
          <div className="space-y-3">
            {design.changeRequests.map((cr) => (
              <div key={cr.id} className="rounded-lg border border-[var(--border)] p-3 space-y-2">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="badge-blue text-[10px]">{cr.type}</span>
                    <span className={`${CR_STATUS_COLORS[cr.status] ?? "badge-neutral"} text-[10px]`}>{cr.status}</span>
                    <span className="text-[11px] text-[var(--text-dim)]">by {cr.requester.name ?? cr.requester.email}</span>
                    <span className="text-[11px] text-[var(--text-dim)]">· {new Date(cr.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <p className="text-[13px] text-[var(--text)]">{cr.description}</p>

                {cr.aiAssessment && (
                  <div className="ai-output-box text-[12px]">
                    <div className="text-[10px] text-[var(--accent)] font-semibold mb-1">AI ASSESSMENT</div>
                    <span className="whitespace-pre-wrap">{cr.aiAssessment}</span>
                  </div>
                )}

                {cr.reviewNote && (
                  <div className="rounded bg-[var(--bg2)] border border-[var(--border)] px-2.5 py-1.5 text-[12px] text-[var(--text-mid)]">
                    <span className="font-semibold">Review note:</span> {cr.reviewNote}
                  </div>
                )}

                {isAdmin && cr.status === "PENDING" && (
                  <div className="space-y-2 pt-1 border-t border-[var(--border)]">
                    {reviewingId === cr.id ? (
                      <div className="space-y-2">
                        <input type="text" value={reviewNote} onChange={(e) => setReviewNote(e.target.value)}
                          placeholder="Review note (required for rejection)" className={inputClass} />
                        <div className="flex gap-2">
                          <button onClick={() => reviewCR(cr.id, "APPROVED")}
                            className="inline-flex items-center gap-1 rounded-[7px] border border-green-600 bg-green-600 px-3 py-1 text-[12px] font-semibold text-white hover:bg-green-700">
                            <CheckCircle className="h-3.5 w-3.5" /> Approve
                          </button>
                          <button onClick={() => reviewCR(cr.id, "REJECTED")} disabled={!reviewNote.trim()}
                            className="inline-flex items-center gap-1 rounded-[7px] border border-red-500 bg-red-500 px-3 py-1 text-[12px] font-semibold text-white hover:bg-red-600 disabled:opacity-50">
                            <XCircle className="h-3.5 w-3.5" /> Reject
                          </button>
                          <button onClick={() => setReviewingId(null)} className="tool-btn text-[12px]">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setReviewingId(cr.id)} className="tool-btn text-[12px]">Review</button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
