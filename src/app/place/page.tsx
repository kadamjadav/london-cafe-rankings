import type { Metadata } from "next";
import { Suspense } from "react";
import PlaceView from "@/components/PlaceView";

export const metadata: Metadata = { title: "Café" };

// Community-added cafés live in the database, so this is a static shell that loads the café in the browser.
export default function PlacePage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <Suspense fallback={<p className="text-sm text-ink-soft">Loading café…</p>}>
        <PlaceView />
      </Suspense>
    </main>
  );
}
