"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { safeJson } from "@/lib/safe-json";

// ── Types ─────────────────────────────────────────────────────────────────────

type Message = { id: string; sender: string; content: string; createdAt: string };
type Thread = {
  id: string;
  subject: string;
  customerName: string;
  tireSpec: string | null;
  quantity: number | null;
  unitPrice: number | null;
  quoteId: string | null;
  status: string;
  updatedAt: string;
  messages: Message[];
};

const SCENARIOS = [
  "Quote Follow-up",
  "Customer Inquiry Reply",
  "Delay Notice",
  "Reorder Reminder",
  "Invoice Delivery",
] as const;

const TONES = [
  "Professional & technical",
  "Friendly & casual",
  "Formal & corporate",
  "Concise & direct",
];

const STATUS_LABEL: Record<string, string> = {
  OPEN: "In Progress",
  AGREED: "Agreed",
  CLOSED: "Closed",
};
const STATUS_COLOR: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-700",
  AGREED: "bg-emerald-100 text-emerald-700",
  CLOSED: "bg-gray-100 text-gray-500",
};

// ── Main Page ──────────────────────────────────────────────────────────────────

function EmailAIContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialThreadId = searchParams.get("threadId");

  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialThreadId);
  const [thread, setThread] = useState<Thread | null>(null);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);

  // Reply
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  // AI Draft
  const [scenario, setScenario] = useState<string>(SCENARIOS[0]);
  const [tone, setTone] = useState(TONES[0]);
  const [draftNotes, setDraftNotes] = useState("");
  const [aiDraft, setAiDraft] = useState("");
  const [generatingDraft, setGeneratingDraft] = useState(false);

  // Convert to order
  const [converting, setConverting] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Load thread list ─────────────────────────────────────────────────────────
  const loadThreads = async () => {
    const r = await fetch("/api/email-threads");
    const d = await safeJson<{ threads?: Thread[] }>(r);
    setThreads(d.threads || []);
    setLoadingThreads(false);
  };

  // ── Load single thread ───────────────────────────────────────────────────────
  const loadThread = async (id: string) => {
    setLoadingThread(true);
    const r = await fetch(`/api/email-threads/${id}`);
    const d = await safeJson<{ thread?: Thread }>(r);
    if (d.thread) setThread(d.thread);
    setLoadingThread(false);
  };

  useEffect(() => { loadThreads(); }, []);
  useEffect(() => {
    if (selectedId) loadThread(selectedId);
    else setThread(null);
  }, [selectedId]);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread?.messages.length]);

  // ── Send reply ───────────────────────────────────────────────────────────────
  const sendReply = async () => {
    if (!reply.trim() || !selectedId || sending) return;
    setSending(true);
    try {
      await fetch(`/api/email-threads/${selectedId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: reply.trim(), sender: "sales" }),
      });
      setReply("");
      setAiDraft("");
      await loadThread(selectedId);
      await loadThreads();
    } finally {
      setSending(false);
    }
  };

  // ── Generate AI draft ────────────────────────────────────────────────────────
  const generateDraft = async () => {
    if (!thread) return;
    setGeneratingDraft(true);
    setAiDraft("");
    try {
      const lastCustomerMsg = [...(thread.messages || [])]
        .reverse()
        .find((m) => m.sender === "customer");
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario,
          tone,
          customerName: thread.customerName,
          notes: [
            thread.tireSpec ? `Tire spec: ${thread.tireSpec}` : "",
            thread.quantity ? `Quantity: ${thread.quantity}` : "",
            thread.unitPrice ? `Unit price: $${thread.unitPrice}` : "",
            lastCustomerMsg ? `Customer's last message: "${lastCustomerMsg.content}"` : "",
            draftNotes,
          ].filter(Boolean).join("\n"),
        }),
      });
      const d = await safeJson<{ body?: string; result?: string }>(res);
      setAiDraft(d.body || d.result || "");
    } finally {
      setGeneratingDraft(false);
    }
  };

  // ── Mark agreed ──────────────────────────────────────────────────────────────
  const markAgreed = async () => {
    if (!selectedId) return;
    await fetch(`/api/email-threads/${selectedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "AGREED" }),
    });
    await loadThread(selectedId);
    await loadThreads();
  };

  // ── Convert to order ─────────────────────────────────────────────────────────
  const convertToOrder = async () => {
    if (!thread) return;
    setConverting(true);
    try {
      const orderNumber = `TO-${Date.now().toString().slice(-6)}`;
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber,
          customerName: thread.customerName,
          tireSpec: thread.tireSpec || "TBD",
          quantity: thread.quantity || 0,
          value: thread.unitPrice && thread.quantity ? thread.unitPrice * thread.quantity : null,
          quoteId: thread.quoteId || null,
        }),
      });
      const d = await safeJson<{ order?: { id: string; orderNumber: string } }>(res);
      if (d.order) {
        await fetch(`/api/email-threads/${selectedId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "CLOSED" }),
        });
        router.push(`/orders?newOrderId=${d.order.id}&orderNumber=${encodeURIComponent(d.order.orderNumber)}&customerName=${encodeURIComponent(thread.customerName)}`);
      }
    } finally {
      setConverting(false);
    }
  };

  // ── Unread count ─────────────────────────────────────────────────────────────
  const unreadCount = threads.filter(
    (t) => t.status === "OPEN" && t.messages.at(-1)?.sender === "customer"
  ).length;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* ── Left: Thread list ────────────────────────────────────────────────── */}
      <div className="flex w-72 shrink-0 flex-col border-r border-[var(--border2)] bg-[var(--card)]">
        <div className="flex items-center justify-between border-b border-[var(--border2)] px-4 py-3">
          <div>
            <span className="text-sm font-bold text-[var(--text)]">Customer Inbox</span>
            {unreadCount > 0 && (
              <span className="ml-2 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingThreads ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-[var(--text-dim)]" /></div>
          ) : threads.length === 0 ? (
            <div className="px-4 py-10 text-center text-xs text-[var(--text-dim)]">
              No threads yet.<br />Go to Quoting and click &ldquo;Send Quote Email&rdquo;.
            </div>
          ) : (
            threads.map((t) => {
              const isUnread = t.status === "OPEN" && t.messages.at(-1)?.sender === "customer";
              const isSelected = t.id === selectedId;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  className={`w-full border-b border-[var(--border2)] px-4 py-3 text-left transition-colors ${
                    isSelected ? "bg-[var(--accent-light)]" : isUnread ? "bg-blue-50" : "hover:bg-[var(--bg)]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`truncate text-[13px] font-semibold ${isUnread ? "text-[var(--text)]" : "text-[var(--text-mid)]"}`}>
                      {t.customerName}
                      {isUnread && <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-blue-500" />}
                    </span>
                    <span className="shrink-0 text-[10px] text-[var(--text-dim)]">
                      {new Date(t.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-[var(--text-dim)]">{t.subject}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${STATUS_COLOR[t.status] || STATUS_COLOR.CLOSED}`}>
                      {STATUS_LABEL[t.status] || t.status}
                    </span>
                    <span className="text-[9px] text-[var(--text-dim)]">{t.messages.length} msgs</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Right: Conversation + AI Draft ──────────────────────────────────── */}
      {!selectedId ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="text-5xl">📨</div>
            <p className="mt-3 font-semibold text-[var(--text)]">Select a conversation</p>
            <p className="mt-1 text-sm text-[var(--text-dim)]">Or go to Quoting to start a new one</p>
          </div>
        </div>
      ) : loadingThread ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--text-dim)]" />
        </div>
      ) : thread ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Thread header */}
          <div className="flex items-center justify-between border-b border-[var(--border2)] px-6 py-3">
            <div>
              <h2 className="text-[15px] font-bold text-[var(--text)]">{thread.subject}</h2>
              <p className="text-xs text-[var(--text-dim)]">
                {thread.customerName}
                {thread.tireSpec && <> · {thread.tireSpec}</>}
                {thread.quantity && <> · Qty {thread.quantity}</>}
                {thread.unitPrice && <> · ${thread.unitPrice.toLocaleString()}/unit</>}
              </p>
            </div>
            <div className="flex gap-2">
              {thread.status === "OPEN" && (
                <button
                  onClick={markAgreed}
                  className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                >
                  ✓ Mark Agreed
                </button>
              )}
              {(thread.status === "AGREED" || (thread.messages.length >= 3 && thread.status !== "CLOSED")) && (
                <button
                  onClick={convertToOrder}
                  disabled={converting}
                  className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {converting ? "Creating…" : "Convert to Order →"}
                </button>
              )}
              {thread.status === "CLOSED" && (
                <span className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-500">✓ Order Created</span>
              )}
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Messages */}
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <div className="flex flex-col gap-4">
                  {thread.messages.map((msg) => {
                    const isSales = msg.sender === "sales";
                    return (
                      <div key={msg.id} className={`flex ${isSales ? "justify-end" : "justify-start"}`}>
                        <div className={`flex max-w-[75%] flex-col gap-1 ${isSales ? "items-end" : "items-start"}`}>
                          <span className="text-[10px] text-[var(--text-dim)]">
                            {isSales ? "You (Sales)" : thread.customerName} ·{" "}
                            {new Date(msg.createdAt).toLocaleString("en-US", {
                              month: "short", day: "numeric",
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </span>
                          <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                            isSales
                              ? "rounded-tr-sm bg-[var(--accent)] text-white"
                              : "rounded-tl-sm bg-[var(--bg)] text-[var(--text)]"
                          }`}>
                            {msg.content}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>
              </div>

              {/* Reply box */}
              {thread.status !== "CLOSED" ? (
                <div className="shrink-0 border-t border-[var(--border2)] px-6 py-4">
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) sendReply(); }}
                    placeholder="Type your reply… (Cmd+Enter to send)"
                    rows={12}
                    className="w-full resize-y rounded-xl border border-[var(--border2)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--text)] placeholder:text-[var(--text-dim)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  />
                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={sendReply}
                      disabled={!reply.trim() || sending}
                      className="rounded-xl bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
                    >
                      {sending ? "Sending…" : "Send Reply"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="shrink-0 border-t border-[var(--border2)] px-6 py-3 text-center text-sm font-semibold text-emerald-700">
                  ✓ Conversation closed — Order created
                </div>
              )}
            </div>

            {/* ── AI Draft Panel ─────────────────────────────────────────── */}
            <div className="flex w-80 shrink-0 flex-col gap-3 overflow-y-auto border-l border-[var(--border2)] bg-[var(--bg)] p-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[var(--text)]">✨ AI Draft</span>
                  <span className="rounded-full bg-[var(--accent-light)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                    AI-powered
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-dim)]">
                  Generate a suggested reply. Review and edit before sending.
                </p>

                {/* Scenario */}
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-[var(--text-mid)]">Scenario</label>
                  <select
                    value={scenario}
                    onChange={(e) => setScenario(e.target.value)}
                    className="w-full rounded-lg border border-[var(--border2)] bg-[var(--card)] px-3 py-2 text-[12px] text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  >
                    {SCENARIOS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {/* Tone */}
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-[var(--text-mid)]">Tone</label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full rounded-lg border border-[var(--border2)] bg-[var(--card)] px-3 py-2 text-[12px] text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  >
                    {TONES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                {/* Extra notes */}
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-[var(--text-mid)]">Additional context (optional)</label>
                  <textarea
                    value={draftNotes}
                    onChange={(e) => setDraftNotes(e.target.value)}
                    placeholder="e.g. offer 5% discount, mention lead time is 2 weeks…"
                    rows={2}
                    className="w-full resize-none rounded-lg border border-[var(--border2)] bg-[var(--card)] px-3 py-2 text-[12px] text-[var(--text)] placeholder:text-[var(--text-dim)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  />
                </div>

                <button
                  onClick={generateDraft}
                  disabled={generatingDraft}
                  className="flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {generatingDraft ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</> : "✨ Generate Draft"}
                </button>

                {/* Draft result */}
                {aiDraft && (
                  <div className="flex flex-col gap-2 rounded-xl border border-[var(--accent)]/20 bg-[var(--accent-light)] p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[var(--accent)]">AI Suggested Reply</span>
                      <button
                        onClick={() => setAiDraft("")}
                        className="text-[11px] text-[var(--text-dim)] hover:text-[var(--text)]"
                      >✕</button>
                    </div>
                    <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-[var(--text)]">{aiDraft}</p>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => setReply(aiDraft)}
                        className="flex-1 rounded-lg bg-[var(--accent)] py-1.5 text-[11px] font-semibold text-white hover:opacity-90"
                      >
                        Use This Draft
                      </button>
                      <button
                        onClick={() => { setReply((prev) => prev + (prev ? "\n\n" : "") + aiDraft); }}
                        className="flex-1 rounded-lg border border-[var(--accent)] py-1.5 text-[11px] font-semibold text-[var(--accent)] hover:bg-[var(--accent-light)]"
                      >
                        Append
                      </button>
                    </div>
                  </div>
                )}
              </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function EmailAIPage() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
      <EmailAIContent />
    </Suspense>
  );
}
