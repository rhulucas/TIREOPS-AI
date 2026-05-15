// Edge-safe config for middleware - no Prisma import

import type { NextAuthConfig } from "next-auth";

function canAccessPath(role: string | undefined, path: string) {
  if (!role || role === "ADMIN") return true;
  if (path.startsWith("/api/")) return true;
  if (path === "/dashboard" || path === "/data-center" || path.startsWith("/orders")) return true;

  if (role === "SALES") {
    return (
      path.startsWith("/customers") ||
      path.startsWith("/quoting") ||
      path.startsWith("/email")
    );
  }

  if (role === "FINANCE") {
    return path.startsWith("/customers") || path.startsWith("/invoice");
  }

  if (role === "ENGINEER") {
    return (
      path.startsWith("/tread-designer") ||
      path.startsWith("/compound-spec") ||
      path.startsWith("/production-lines")
    );
  }

  return false;
}

export const authConfig: NextAuthConfig = {
  providers: [],
  pages: { signIn: "/login" },
  trustHost: true,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const path = request.nextUrl.pathname;
      const isLoginPage = path.startsWith("/login");
      const isLandingPage = path === "/";
      const isPublicPage = path === "/privacy" || path === "/terms";
      const isDevPage = path.startsWith("/sql-runner") && process.env.NODE_ENV === "development";
      if (isLoginPage) {
        if (isLoggedIn) return Response.redirect(new URL("/dashboard", request.url));
        return true;
      }
      if (isLandingPage || isPublicPage || isDevPage) {
        if (isLoggedIn && isLandingPage) return Response.redirect(new URL("/dashboard", request.url));
        return true;
      }
      if (!isLoggedIn) {
        const url = new URL("/login", request.url);
        url.searchParams.set("callbackUrl", path);
        return Response.redirect(url);
      }
      const role = (auth?.user as { role?: string } | undefined)?.role;
      if (!canAccessPath(role, path)) {
        return Response.redirect(new URL("/dashboard", request.url));
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = (user as { id?: string }).id;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
};
