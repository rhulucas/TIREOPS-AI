"use client";

import { useEffect } from "react";
import { safeJson } from "@/lib/safe-json";

const PROTECTED_PATHS = ["/dashboard", "/quoting", "/orders", "/email", "/invoice", "/tread-designer", "/compound-spec", "/customers"];

function isProtected(path: string) {
  return path !== "/" && path !== "/login" && PROTECTED_PATHS.some((p) => path === p || path.startsWith(p + "/"));
}

export function BFCacheGuard() {
  useEffect(() => {
    const handler = (e: PageTransitionEvent) => {
      if (e.persisted) {
        const path = typeof window !== "undefined" ? window.location.pathname : "";
        if (isProtected(path)) {
          fetch("/api/auth/session")
            .then((r) => safeJson<{ user?: unknown }>(r))
            .then((data) => {
              if (!data?.user) {
                window.location.replace("/");
              }
            });
        }
      }
    };
    window.addEventListener("pageshow", handler);
    return () => window.removeEventListener("pageshow", handler);
  }, []);

  return null;
}
