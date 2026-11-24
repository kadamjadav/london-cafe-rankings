import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import AuthButton from "@/components/AuthButton";

const SITE_NAME = "London Café Rankings";

export const metadata: Metadata = {
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: "Every London café I've visited, ranked — with a map, honest scores and reviews from other coffee drinkers.",
  openGraph: { title: SITE_NAME, description: "Every London café I've visited, ranked.", type: "website" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-[#faf7f2] text-stone-900">
        <header className="border-b border-stone-200 bg-[#faf7f2]/90 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
            <Link href="/" className="text-lg font-bold tracking-tight">
              ☕ {SITE_NAME}
            </Link>
            <nav className="flex items-center gap-1 text-sm sm:gap-3">
              <Link href="/" className="hidden rounded-full px-3 py-1.5 hover:bg-stone-200/60 sm:inline">
                Het&apos;s picks
              </Link>
              <Link href="/cafes" className="rounded-full px-3 py-1.5 hover:bg-stone-200/60">
                All cafés
              </Link>
              <Link href="/add-cafe" className="rounded-full px-3 py-1.5 hover:bg-stone-200/60">
                + Add
              </Link>
              <AuthButton />
            </nav>
          </div>
        </header>
        <div className="flex-1">{children}</div>
        <footer className="border-t border-stone-200 py-6 text-center text-xs text-stone-500">
          Map data © OpenStreetMap contributors ·{" "}
          <Link href="/privacy" className="underline">
            Privacy & community rules
          </Link>
        </footer>
      </body>
    </html>
  );
}
