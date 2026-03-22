"use client";

import Link from "next/link";

const footerLinks = {
  support: [
    { label: "Contact Us", href: "#" },
    { label: "Help & Documentation", href: "#" },
    { label: "FAQs", href: "#" },
    { label: "System Status", href: "#" },
  ],
  about: [
    { label: "About Us", href: "#" },
    { label: "Careers", href: "#" },
    { label: "Internal Policies", href: "#" },
  ],
  legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Use", href: "/terms" },
  ],
};

export function LandingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--border)] bg-[#1e293b] text-white">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#94a3b8]">
              Internal Support
            </h4>
            <div className="mt-4 space-y-2">
              <p className="text-sm text-[#cbd5e1]">IT Help Desk: 800-555-0100</p>
              <p className="text-sm text-[#cbd5e1]">Platform Support: support@tireops.com</p>
              <p className="mt-3 text-xs text-[#64748b]">
                Mon–Fri 8:00–18:00 ET<br />
                Sat 9:00–14:00 ET
              </p>
            </div>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#94a3b8]">
              Support
            </h4>
            <ul className="mt-4 space-y-2">
              {footerLinks.support.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="text-sm text-[#cbd5e1] hover:text-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#94a3b8]">
              Company
            </h4>
            <ul className="mt-4 space-y-2">
              {footerLinks.about.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="text-sm text-[#cbd5e1] hover:text-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#94a3b8]">
              Legal
            </h4>
            <ul className="mt-4 space-y-2">
              {footerLinks.legal.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="text-sm text-[#cbd5e1] hover:text-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-[#334155] pt-8 sm:flex-row">
          <p className="text-xs text-[#64748b]">
            © {currentYear} TireOps. All rights reserved. Internal use only.
          </p>
          <div className="flex gap-6">
            <Link href="/privacy" className="text-xs text-[#64748b] hover:text-[#94a3b8]">
              Privacy
            </Link>
            <Link href="/terms" className="text-xs text-[#64748b] hover:text-[#94a3b8]">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
