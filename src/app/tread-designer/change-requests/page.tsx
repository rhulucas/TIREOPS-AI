"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { safeJson } from "@/lib/safe-json";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";

const CR_STATUS_COLORS: Record<string, string> = {
  PENDING: "badge-amber", APPROVED: "badge-green", REJECTED: "badge-red",
};

type CR = {
  id: string;
  type: string;
  description: string;
  status: string;
  aiAssessment: string | null;
  reviewNote: string | null;
  createdAt: string;
  design: { id: string; name: string | null; category: string; season: string };
  requester: { name: string | null; email: string };
  reviewer: { name: string | null } | null;
};

export default function ChangeRequestsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role;
  const isAdmin = role === "ADMIN";

  const [requests, setRequests] = useState<CR[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("PENDING");
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus) params.set("status", filterStatus);
    const res = await fetch(`/api/change-requests?${params}`);
    const data = await safeJson<{ requests?: CR[] }>(res);
    setRequests(data.requests ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filterStatus]);

  const review = async (id: string, status: "APPROVED" | "REJECTED") => {
    await fetch(`/api/change-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, reviewNote }),
    });
    setReviewingId(null);
    setReviewNote("");
    await load();
  };

  const inputClass = "form-input w-full rounded-[7px] border border-[var(--border2)] bg-[var(--bg)] px-3 py-2 text-[13px] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none";

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="tool-btn p-1.5">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-base font-bold text-[var(--text)]">Change Requests</h1>
          <p className="text-xs text-[var(--text-dim)]">{isAdmin ? "Review and approve engineer change requests" : "Your submitted change requests"}</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {["PENDING", "APPROVED", "REJECTED", ""].map((s) => (
          <button key={s || "all"} onClick={() => setFilterStatus(s)}
            className={`tool-btn text-xs ${filterStatus === s ? "active" : ""}`}>
            {s || "All"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-[var(--text-dim)]">Loading...</div>
      ) : requests.length === 0 ? (
        <div className="py-16 text-center text-sm text-[var(--text-dim)]">No change requests found.</div>
      ) : (
        <div className="space-y-3">
          {requests.map((cr) => (
            <div key={cr.id} className="card space-y-3">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="badge-blue text-[10px]">{cr.type}</span>
                  <span className={`${CR_STATUS_COLORS[cr.status] ?? "badge-neutral"} text-[10px]`}>{cr.status}</span>
                  <button onClick={() => router.push(`/tread-designer/${cr.design.id}`)}
                    className="text-[13px] font-semibold text-[var(--accent)] hover:underline">
                    {cr.design.name ?? "—"}
                  </button>
                  <span className="text-[11px] text-[var(--text-dim)]">{cr.design.category} · {cr.design.season}</span>
                </div>
                <div className="text-[11px] text-[var(--text-dim)]">
                  {cr.requester.name ?? cr.requester.email} · {new Date(cr.createdAt).toLocaleDateString()}
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
                  {cr.reviewer && <span className="ml-1 text-[var(--text-dim)]">— {cr.reviewer.name}</span>}
                </div>
              )}

              {isAdmin && cr.status === "PENDING" && (
                <div className="border-t border-[var(--border)] pt-3 space-y-2">
                  {reviewingId === cr.id ? (
                    <div className="space-y-2">
                      <input type="text" value={reviewNote} onChange={(e) => setReviewNote(e.target.value)}
                        placeholder="Review note (required for rejection)" className={inputClass} />
                      <div className="flex gap-2">
                        <button onClick={() => review(cr.id, "APPROVED")}
                          className="inline-flex items-center gap-1 rounded-[7px] border border-green-600 bg-green-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-green-700">
                          <CheckCircle className="h-3.5 w-3.5" /> Approve
                        </button>
                        <button onClick={() => review(cr.id, "REJECTED")} disabled={!reviewNote.trim()}
                          className="inline-flex items-center gap-1 rounded-[7px] border border-red-500 bg-red-500 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-red-600 disabled:opacity-50">
                          <XCircle className="h-3.5 w-3.5" /> Reject
                        </button>
                        <button onClick={() => setReviewingId(null)} className="tool-btn text-[12px]">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setReviewingId(cr.id)} className="tool-btn text-[12px]">Review this request</button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
