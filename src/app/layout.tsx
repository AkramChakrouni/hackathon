import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const sans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TenderScale — security questionnaires from your own policies",
  description: "Every answer quoted from the policy, every conflict flagged, no answer without a source. Open models on Nebius Token Factory.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="flex h-12 items-center justify-between border-b border-line px-5 text-sm">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-accent shadow-[0_0_12px_var(--color-accent)]" />
            TenderScale
          </Link>
          <nav className="flex gap-5 text-mute">
            <Link href="/" className="hover:text-fg">Workspace</Link>
            <Link href="/benchmark" className="hover:text-fg">Benchmark</Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
