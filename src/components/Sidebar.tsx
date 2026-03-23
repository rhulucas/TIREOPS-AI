"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  FileText,
  ShoppingCart,
  Inbox,
  Receipt,
  PencilRuler,
  FlaskConical,
  Users,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navSections = [
  {
    label: "Main",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/customers", label: "Customers", icon: Users },
    ],
  },
  {
    label: "AI Modules",
    items: [
      { href: "/quoting", label: "Sales Quote Assistant", icon: FileText },
      { href: "/orders", label: "Orders", icon: ShoppingCart },
      { href: "/email", label: "Email AI + Inbox", icon: Inbox },
      { href: "/invoice", label: "Invoice AI", icon: Receipt },
    ],
  },
  {
    label: "Manufacturing",
    items: [
      { href: "/tread-designer", label: "Tread Designer", icon: PencilRuler },
      { href: "/compound-spec", label: "Compound Spec", icon: FlaskConical },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 min-w-60 flex-col" style={{ background: "#1e2433", borderRight: "1px solid #2d3548" }}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5" style={{ borderBottom: "1px solid #2d3548" }}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg" style={{ background: "#1d4ed8" }}>
          🛞
        </div>
        <div>
          <div className="text-base font-bold tracking-tight text-white">
            TireOps AI
          </div>
          <div className="text-[11px]" style={{ color: "#64748b" }}>
            Manufacturing Platform
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-4 overflow-y-auto p-4 pt-3">
        {navSections.map((section) => (
          <div key={section.label}>
            <div className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#475569" }}>
              {section.label}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-[7px] px-3 py-2.5 text-[13.5px] font-medium transition-all",
                    )}
                    style={
                      isActive
                        ? { background: "#2d3548", color: "#ffffff", fontWeight: 600 }
                        : { color: "#94a3b8" }
                    }
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.background = "#252d40";
                        (e.currentTarget as HTMLElement).style.color = "#e2e8f0";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.background = "transparent";
                        (e.currentTarget as HTMLElement).style.color = "#94a3b8";
                      }
                    }}
                  >
                    <Icon className="h-[17px] w-[17px] shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* AI status */}
      <div className="p-4" style={{ borderTop: "1px solid #2d3548" }}>
        <div className="flex items-center gap-2 rounded-full px-3 py-1.5" style={{ background: "#0d2d1a", border: "1px solid #14532d" }}>
          <div className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: "#22c55e" }} />
          <span className="text-xs font-semibold" style={{ color: "#22c55e" }}>
            AI — Connected
          </span>
        </div>
      </div>

      {/* Sign out */}
      <div className="p-4" style={{ borderTop: "1px solid #2d3548" }}>
        <button
          type="button"
          onClick={async () => {
            await signOut({ redirect: false });
            window.location.replace("/");
          }}
          className="flex w-full items-center gap-2.5 rounded-[7px] px-3 py-2.5 text-[13.5px] font-medium transition-colors"
          style={{ color: "#64748b" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "#252d40";
            (e.currentTarget as HTMLElement).style.color = "#e2e8f0";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.color = "#64748b";
          }}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
