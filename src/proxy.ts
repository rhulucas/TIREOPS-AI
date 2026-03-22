// Next.js 16: proxy replaces middleware (Edge runtime not supported in proxy)
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth-config";

const { auth } = NextAuth({
  ...authConfig,
  secret: process.env.AUTH_SECRET,
  providers: [], // No Credentials to avoid Prisma in proxy
});

export const proxy = auth;

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - api/auth (NextAuth)
     * - _next/static
     * - _next/image
     * - favicon
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
