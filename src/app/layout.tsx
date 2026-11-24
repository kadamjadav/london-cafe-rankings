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
      <body className="flex min-h-full flex-col bg-chalk text-ink">
        {/* Shopfront fascia: awning green with brass lettering. */}
        <header className="bg-awning text-chalk">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-4">
            <Link href="/" className="font-display text-2xl text-[#d9bd7a] sm:text-[1.7rem]">
              {SITE_NAME}
            </Link>
            <nav className="flex items-center gap-1 text-sm" aria-label="Main">
              <Link href="/" className="hidden px-3 py-1.5 text-chalk/85 hover:text-chalk sm:inline">
                Kadam&apos;s picks
              </Link>
              <Link href="/cafes" className="px-3 py-1.5 text-chalk/85 hover:text-chalk">
                All cafés
              </Link>
              <Link href="/add-cafe" className="px-3 py-1.5 text-chalk/85 hover:text-chalk">
                Add a café
              </Link>
              <span className="ml-2">
                <AuthButton />
              </span>
            </nav>
          </div>
        </header>
        <div className="flex-1">{children}</div>
        <footer className="mt-16 border-t border-rule">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap justify-between gap-3 px-5 py-8 text-xs text-ink-soft">
            <p>
              <span className="font-display text-sm text-ink">{SITE_NAME}</span>, kept by Kadam. Map data ©
              OpenStreetMap contributors.
            </p>
            <Link href="/privacy" className="underline underline-offset-2 hover:text-ink">
              Privacy and community rules
            </Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
