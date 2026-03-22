"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname?.startsWith("/login");
  const isLanding = pathname === "/";
  const isPublic = pathname === "/privacy" || pathname === "/terms";
  const isDev = pathname?.startsWith("/sql-runner");

  if (isLogin || isLanding || isPublic || isDev) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto bg-[var(--bg2)] p-6 px-7">{children}</main>
      </div>
    </div>
  );
}
