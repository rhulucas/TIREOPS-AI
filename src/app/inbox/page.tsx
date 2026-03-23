"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { safeJson } from "@/lib/safe-json";

type Message = { id: string; sender: string; content: string; createdAt: string };
type Thread = {
  id: string;
  subject: string;
  customerName: string;
  tireSpec: string | null;
  quantity: number | null;
  unitPrice: number | null;
  status: string;
  updatedAt: string;
  messages: Message[];
};

const statusLabel: Record<string, string> = {
  OPEN: "In Progress",
  AGREED: "Agreed",
  CLOSED: "Closed",
};
const statusColor: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-700",
  AGREED: "bg-emerald-100 text-emerald-700",
  CLOSED: "bg-gray-100 text-gray-500",
};

export default function InboxPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const r = await fetch("/api/email-threads");
    const d = await safeJson<{ threads?: Thread[] }>(r);
    setThreads(d.threads || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const unread = threads.filter(
    (t) => t.status === "OPEN" && t.messages.length > 0 && t.messages[t.messages.length - 1]?.sender === "customer"
  ).length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Customer Inbox</h1>
          <p className="mt-0.5 text-sm text-[var(--text-dim)]">Quote negotiation threads with customers</p>
        </div>
        {unread > 0 && (
          <span className="rounded-full bg-red-500 px-3 py-1 text-sm font-bold text-white">
            {unread} unread
          </span>
        )}
      </div>

      {loading ? (
        <div className="py-20 text-center text-[var(--text-dim)]">Loading…</div>
      ) : threads.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border2)] bg-[var(--card)] p-16 text-center">
          <div className="text-4xl">📬</div>
          <p className="mt-3 font-semibold text-[var(--text)]">No email threads yet</p>
          <p className="mt-1 text-sm text-[var(--text-dim)]">
            Go to <Link href="/quoting" className="text-[var(--accent)] hover:underline">Quoting</Link> and click &ldquo;Send Quote Email&rdquo; to start a conversation.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {threads.map((t) => {
            const lastMsg = t.messages[t.messages.length - 1];
            const isUnread = t.status === "OPEN" && lastMsg?.sender === "customer";
            return (
              <Link
                key={t.id}
                href={`/inbox/${t.id}`}
                className={`flex items-start gap-4 rounded-2xl border p-4 transition-all hover:shadow-md ${
                  isUnread
                    ? "border-blue-200 bg-blue-50"
                    : "border-[var(--border2)] bg-[var(--card)]"
                }`}
              >
                {/* Avatar */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-bold text-white">
                  {t.customerName.charAt(0).toUpperCase()}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`font-semibold ${isUnread ? "text-[var(--text)]" : "text-[var(--text-mid)]"}`}>
                      {t.customerName}
                      {isUnread && <span className="ml-2 inline-block h-2 w-2 rounded-full bg-blue-500" />}
                    </span>
                    <span className="shrink-0 text-xs text-[var(--text-dim)]">
                      {new Date(t.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm font-medium text-[var(--text-mid)]">{t.subject}</p>
                  {lastMsg && (
                    <p className="mt-1 truncate text-xs text-[var(--text-dim)]">
                      <span className="font-medium">{lastMsg.sender === "sales" ? "You" : t.customerName}:</span>{" "}
                      {lastMsg.content.slice(0, 100)}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColor[t.status] || statusColor.CLOSED}`}>
                      {statusLabel[t.status] || t.status}
                    </span>
                    {t.tireSpec && (
                      <span className="rounded-full bg-[var(--bg)] px-2 py-0.5 text-[10px] text-[var(--text-dim)]">
                        {t.tireSpec}
                      </span>
                    )}
                    {t.quantity && (
                      <span className="rounded-full bg-[var(--bg)] px-2 py-0.5 text-[10px] text-[var(--text-dim)]">
                        Qty: {t.quantity}
                      </span>
                    )}
                    <span className="rounded-full bg-[var(--bg)] px-2 py-0.5 text-[10px] text-[var(--text-dim)]">
                      {t.messages.length} messages
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
