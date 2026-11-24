import type { Metadata } from "next";
import { Suspense } from "react";
import ProfileView from "@/components/ProfileView";

export const metadata: Metadata = { title: "Profile" };

// Profiles live in the database, so the page is a static shell that loads the person in the browser.
export default function ProfilePage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <Suspense fallback={<p className="text-sm text-ink-soft">Loading profile…</p>}>
        <ProfileView />
      </Suspense>
    </main>
  );
}
