import Link from "next/link";
import { LandingHeader } from "@/components/LandingHeader";
import { LandingFooter } from "@/components/LandingFooter";

export const metadata = {
  title: "Terms of Use - TireOps AI",
  description: "TireOps AI Manufacturing Platform Terms of Use",
};

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <LandingHeader />
      <main className="flex-1 bg-white">
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/" className="mb-8 inline-block text-sm text-[var(--accent)] hover:underline">
        ← Back to Home
      </Link>
      <h1 className="text-3xl font-bold text-[var(--text)]">Terms of Use</h1>
      <p className="mt-2 text-sm text-[var(--text-dim)]">Last updated: February 2026</p>
      <div className="prose prose-sm mt-8 text-[var(--text-mid)]">
        <h2 className="text-lg font-semibold text-[var(--text)]">1. Acceptance</h2>
        <p className="mt-2">
          By accessing TireOps internal operations platform, you agree to these terms. This system is for authorized TireOps employees only.
        </p>
        <h2 className="mt-6 text-lg font-semibold text-[var(--text)]">2. Authorized Access</h2>
        <p className="mt-2">
          Only TireOps employees and authorized personnel may access this platform. Unauthorized access is prohibited.
        </p>
        <h2 className="mt-6 text-lg font-semibold text-[var(--text)]">3. Acceptable Use</h2>
        <p className="mt-2">
          Use the platform for legitimate business operations only. Do not share credentials or misuse company data.
        </p>
        <h2 className="mt-6 text-lg font-semibold text-[var(--text)]">4. Contact</h2>
        <p className="mt-2">
          For questions, contact support@tireops.com.
        </p>
      </div>
    </div>
      </main>
      <LandingFooter />
    </div>
  );
}
