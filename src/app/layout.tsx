import type { Metadata } from "next";
import { Providers } from "@/components/Providers";
import { AppShell } from "@/components/AppShell";
import { BFCacheGuard } from "@/components/BFCacheGuard";
import "./globals.css";

export const metadata: Metadata = {
  title: "TireOps AI - Internal Manufacturing Platform",
  description: "TireOps tire manufacturing company internal operations: production, AI quoting, order management, tread design, compound spec",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[var(--bg2)] text-[var(--text)] font-sans antialiased">
        <Providers>
          <BFCacheGuard />
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
