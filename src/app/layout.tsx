import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { MODELS } from "@/lib/nebius";
import "./globals.css";

const sans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Attest — questionnaire & RFP autopilot",
  description: "Every answer cited. Every risk flagged. Open models on Nebius Token Factory.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="flex h-12 items-center justify-between border-b border-line px-5 text-sm">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-accent shadow-[0_0_12px_var(--color-accent)]" />
            Attest
            <span className="ml-2 hidden rounded border border-line px-1.5 py-0.5 font-mono text-[10px] font-normal text-mute">
              Nebius Token Factory · {[MODELS.synthesizer, MODELS.classifier, MODELS.embedding].map((m) => m.split("/")[1]).join(" · ")}
            </span>
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
