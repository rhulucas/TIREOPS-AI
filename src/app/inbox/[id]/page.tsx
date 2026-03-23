"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { safeJson } from "@/lib/safe-json";

type Message = { id: string; sender: string; content: string; createdAt: string };
type Thread = {
  id: string;
  subject: string;
  customerName: string;
  customerEmail: string | null;
  tireSpec: string | null;
  quantity: number | null;
  unitPrice: number | null;
  quoteId: string | null;
  status: string;
  messages: Message[];
};

export default function ThreadPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [thread, setThread] = useState<Thread | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [converting, setConverting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    const r = await fetch(`/api/email-threads/${id}`);
    const d = await safeJson<{ thread?: Thread }>(r);
    if (d.thread) setThread(d.thread);
  };

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread?.messages.length]);

  const sendReply = async () => {
    if (!reply.trim() || sending) return;
    setSending(true);
    try {
      await fetch(`/api/email-threads/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: reply.trim(), sender: "sales" }),
      });
      setReply("");
      await load();
    } finally {
      setSending(false);
    }
  };

  const markAgreed = async () => {
    await fetch(`/api/email-threads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "AGREED" }),
    });
    await load();
  };

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
        await fetch(`/api/email-threads/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "CLOSED" }),
        });
        router.push(`/orders?newOrderId=${d.order.id}&orderNumber=${encodeURIComponent(d.order.orderNumber)}&customerName=${encodeURIComponent(thread.customerName)}&tireSpec=${encodeURIComponent(thread.tireSpec || "")}&quantity=${thread.quantity || 0}`);
      }
    } finally {
      setConverting(false);
    }
  };

  if (!thread) return <div className="py-20 text-center text-[var(--text-dim)]">Loading…</div>;

  const canConvert = thread.status === "AGREED" || (
    thread.messages.length >= 2 &&
    thread.messages[thread.messages.length - 1]?.sender === "customer"
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col px-4 py-8" style={{ height: "calc(100vh - 64px)" }}>
      {/* Header */}
      <div className="mb-4">
        <Link href="/inbox" className="text-sm text-[var(--accent)] hover:underline">← Back to Inbox</Link>
        <div className="mt-3 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-[var(--text)]">{thread.subject}</h1>
            <p className="mt-0.5 text-sm text-[var(--text-dim)]">
              Customer: <span className="font-semibold text-[var(--text-mid)]">{thread.customerName}</span>
              {thread.tireSpec && <> · {thread.tireSpec}</>}
              {thread.quantity && <> · Qty {thread.quantity}</>}
              {thread.unitPrice && <> · ${thread.unitPrice.toLocaleString()}/unit</>}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            {thread.status === "OPEN" && (
              <button
                onClick={markAgreed}
                className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
              >
                ✓ Mark Agreed
              </button>
            )}
            {canConvert && thread.status !== "CLOSED" && (
              <button
                onClick={convertToOrder}
                disabled={converting}
                className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {converting ? "Creating…" : "Convert to Order →"}
              </button>
            )}
            {thread.status === "CLOSED" && (
              <span className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-500">Order Created</span>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto rounded-2xl border border-[var(--border2)] bg-[var(--card)] p-4">
        <div className="flex flex-col gap-4">
          {thread.messages.map((msg) => {
            const isSales = msg.sender === "sales";
            return (
              <div key={msg.id} className={`flex ${isSales ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] ${isSales ? "items-end" : "items-start"} flex flex-col gap-1`}>
                  <span className="text-[10px] font-semibold text-[var(--text-dim)]">
                    {isSales ? "You (Sales)" : thread.customerName} ·{" "}
                    {new Date(msg.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}{" "}
                    {new Date(msg.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      isSales
                        ? "rounded-tr-sm bg-[var(--accent)] text-white"
                        : "rounded-tl-sm bg-[var(--bg)] text-[var(--text)]"
                    }`}
                  >
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
        <div className="mt-4 flex gap-2">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) sendReply(); }}
            placeholder="Type your reply… (Cmd+Enter to send)"
            rows={3}
            className="flex-1 resize-none rounded-xl border border-[var(--border2)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--text)] placeholder:text-[var(--text-dim)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
          <button
            onClick={sendReply}
            disabled={!reply.trim() || sending}
            className="self-end rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center text-sm font-semibold text-emerald-700">
          ✓ Conversation closed — Order has been created
        </div>
      )}
    </div>
  );
}
