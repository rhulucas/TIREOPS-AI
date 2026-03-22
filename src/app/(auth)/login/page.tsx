"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (res?.error) {
        setError("Invalid email or password");
        setLoading(false);
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative flex min-h-screen items-center justify-center bg-[var(--bg2)]"
      style={{
        backgroundImage: "url('/login-bg.svg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: "#1e293b",
      }}
    >
      <div
        className="relative z-10 w-full max-w-sm rounded-xl border border-[var(--border)] bg-white/95 p-8 shadow-xl backdrop-blur-sm"
        style={{ boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}
      >
        <div className="mb-6 flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)] text-lg text-white">
            🛞
          </div>
          <span className="text-base font-bold tracking-tight text-[var(--text)]">
            TireOps AI
          </span>
        </div>
        <h1 className="mb-6 text-xl font-bold text-[var(--text)]">Sign In</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[var(--text-mid)]">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-[7px] border border-[var(--border2)] bg-[var(--bg)] px-3 py-2.5 text-[13.5px] text-[var(--text)] placeholder-[var(--text-light)] transition-colors focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(29,111,219,0.12)] focus:outline-none"
              placeholder="admin@tireops.com"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[var(--text-mid)]">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-[7px] border border-[var(--border2)] bg-[var(--bg)] px-3 py-2.5 text-[13.5px] text-[var(--text)] placeholder-[var(--text-light)] transition-colors focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(29,111,219,0.12)] focus:outline-none"
            />
          </div>
          {error && (
            <p className="text-sm text-[var(--accent2)]">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-[7px] bg-[var(--accent)] px-4 py-2.5 text-[13px] font-semibold text-white transition-all hover:bg-[#1860c4] hover:shadow-[0_4px_12px_rgba(29,111,219,0.3)] hover:-translate-y-px disabled:opacity-50 disabled:transform-none disabled:shadow-none"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#1e293b] text-[var(--text-dim)]">
          Loading...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
