import type { Metadata } from "next";
import AllCafes from "@/components/AllCafes";

export const metadata: Metadata = {
  title: "All cafés",
  description: "Every London café on the site — Kadam's picks and the ones added by the community — with reviews from everyone.",
};

export default function CafesPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <AllCafes />
    </main>
  );
}
