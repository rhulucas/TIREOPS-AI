"use client";

import { useState, useEffect, useRef } from "react";
import { safeJson } from "@/lib/safe-json";

export type Customer = { id: string; name: string | null; company: string | null; email: string | null; address: string | null };

type Props = {
  value: string;
  onChange: (value: string, customer?: Customer | null | undefined) => void;
  placeholder?: string;
  className?: string;
};

export function CustomerAutocomplete({ value, onChange, placeholder = "Search customer...", className = "" }: Props) {
  const [q, setQ] = useState(value);
  const [suggestions, setSuggestions] = useState<Customer[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQ(value);
  }, [value]);

  useEffect(() => {
    if (!q.trim()) {
      setSuggestions([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/customers?q=${encodeURIComponent(q)}`);
        const data = await safeJson<{ customers?: Customer[] }>(res);
        setSuggestions(data.customers || []);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [q]);

  useEffect(() => {
    function clickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", clickOutside);
    return () => document.removeEventListener("mousedown", clickOutside);
  }, []);

  const select = (c: Customer | null) => {
    const display = c ? (c.company || c.name || "") : "";
    setQ(display);
    onChange(display, c);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <input
        type="text"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          onChange(e.target.value, null);
          setOpen(true);
        }}
        onFocus={() => q.trim() && setOpen(true)}
        placeholder={placeholder}
        className="form-input w-full rounded-[7px] border border-[var(--border2)] bg-[var(--bg)] px-3 py-2.5 text-[13.5px] text-[var(--text)] placeholder-[var(--text-light)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(29,111,219,0.12)] focus:outline-none"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-auto rounded-lg border border-[var(--border2)] bg-white py-1 shadow-lg">
          {loading ? (
            <li className="px-3 py-2 text-sm text-[var(--text-dim)]">Searching...</li>
          ) : (
            suggestions.map((c) => (
              <li
                key={c.id}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && select(c)}
                onClick={() => select(c)}
                className="cursor-pointer px-3 py-2 text-[13px] text-[var(--text)] hover:bg-[var(--accent-light)]"
              >
                {c.company || c.name || "—"} {c.email ? `(${c.email})` : ""}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
