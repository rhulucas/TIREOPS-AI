import Link from "next/link";
import { LandingHeader } from "@/components/LandingHeader";
import { LandingFooter } from "@/components/LandingFooter";

export const metadata = {
  title: "Privacy Policy - TireOps AI",
  description: "TireOps AI Manufacturing Platform Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <LandingHeader />
      <main className="flex-1 bg-white">
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/" className="mb-8 inline-block text-sm text-[var(--accent)] hover:underline">
        ← Back to Home
      </Link>
      <h1 className="text-3xl font-bold text-[var(--text)]">Privacy Policy</h1>
      <p className="mt-2 text-sm text-[var(--text-dim)]">Last updated: February 2026</p>
      <div className="prose prose-sm mt-8 text-[var(--text-mid)]">
        <h2 className="text-lg font-semibold text-[var(--text)]">1. Internal Use</h2>
        <p className="mt-2">
          TireOps is a tire manufacturing company. This platform is our internal operations system. User data and platform activity are accessed only by authorized employees for operational purposes.
        </p>
        <h2 className="mt-6 text-lg font-semibold text-[var(--text)]">2. Data Collection</h2>
        <p className="mt-2">
          We collect login credentials, usage data, and operational records necessary for platform functionality and internal analytics.
        </p>
        <h2 className="mt-6 text-lg font-semibold text-[var(--text)]">3. Data Security</h2>
        <p className="mt-2">
          All data is stored securely and transmitted over encrypted connections. Access is restricted to authorized employees.
        </p>
        <h2 className="mt-6 text-lg font-semibold text-[var(--text)]">4. Contact</h2>
        <p className="mt-2">
          For privacy inquiries, contact support@tireops.com.
        </p>
      </div>
    </div>
      </main>
      <LandingFooter />
    </div>
  );
}
