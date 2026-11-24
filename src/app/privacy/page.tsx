import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy & community rules" };

// TEMPLATE: this is a starting point, not legal advice. Fill in the bracketed bits and review it yourself.
export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 text-stone-700">
      <h1 className="mb-6 text-3xl font-bold text-stone-900">Privacy & community rules</h1>

      <h2 className="mt-8 text-xl font-semibold text-stone-900">What we store</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>Your email address, only to send you sign-in links. It is never shown publicly.</li>
        <li>Your display name, reviews, comments, likes and any photos you upload — these are public.</li>
        <li>Reports you file, visible only to the site admin.</li>
      </ul>
      <p className="mt-3">
        Photos are re-encoded in your browser before upload, which removes location (GPS) and camera metadata. Data
        is stored with Supabase. There are no ads and no tracking cookies.
      </p>

      <h2 className="mt-8 text-xl font-semibold text-stone-900">Deleting your data</h2>
      <p className="mt-2">
        You can delete any of your reviews or comments yourself. To delete your account entirely, email [your contact
        email] and it will be removed within 30 days.
      </p>

      <h2 className="mt-8 text-xl font-semibold text-stone-900">Community rules</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>Review cafés you&apos;ve actually visited.</li>
        <li>No harassment, hate, spam, advertising or personal information about other people.</li>
        <li>Only upload photos you took. No photos where strangers are the focus.</li>
        <li>Use the Report button on anything that breaks these rules — reports are reviewed and content removed.</li>
      </ul>

      <p className="mt-8 text-sm text-stone-500">Contact: [your contact email]</p>
    </main>
  );
}
