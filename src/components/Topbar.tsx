"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const pageMeta: Record<string, [string, string]> = {
  "/dashboard": ["Dashboard", "Overview of operations"],
  "/customers": ["Customers", "Customer intelligence & reorder planning"],
  "/quoting": ["Sales Quote Assistant", "Generate pricing recommendations and sales guidance"],
  "/orders": ["Order Management", "Production queue"],
  "/email": ["Email AI", "Customer communications"],
  "/invoice": ["Invoice AI", "Accounting & billing"],
  "/tread-designer": ["Tread Designer", "Design library & change management"],
  "/compound-spec": ["Compound Spec", "Rubber formulation generator"],
};

function getPageMeta(pathname: string): [string, string] {
  for (const [path, meta] of Object.entries(pageMeta)) {
    if (pathname === path || pathname.startsWith(path + "/")) return meta;
  }
  return ["TireOps AI", ""];
}

export function Topbar() {
  const pathname = usePathname();
  const [time, setTime] = useState("");

  useEffect(() => {
    const update = () =>
      setTime(
        new Date().toLocaleTimeString("en-US", { hour12: false })
      );
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  const [title, subtitle] = getPageMeta(pathname || "/");

  return (
    <header className="flex h-14 items-center gap-3 border-b border-[var(--border)] bg-[var(--bg)] px-7 shadow-[var(--shadow)]">
      <div>
        <div className="text-[17px] font-bold text-[var(--text)]">
          {title}
        </div>
        <div className="text-[13px] text-[var(--text-dim)]">
          {subtitle}
        </div>
      </div>
      <div className="ml-auto">
        <div className="rounded-md border border-[var(--border)] bg-[var(--bg3)] px-2.5 py-1.5 font-mono text-xs text-[var(--text-mid)]">
          {time}
        </div>
      </div>
    </header>
  );
}
