import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Logo } from "@/components/logo";
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
            <Logo size={20} />
            TenderScale
          </Link>
          <nav className="flex gap-5 text-mute">
            <Link href="/" className="hover:text-fg">App</Link><Link href="/reference" className="hover:text-fg">Reference UI</Link>
            <Link href="/benchmark" className="hover:text-fg">Benchmark</Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
