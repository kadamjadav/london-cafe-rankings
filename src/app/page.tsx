import Link from "next/link";
import RankingExplorer from "@/components/RankingExplorer";
import { getRankedCafes } from "@/lib/cafes";

export default function Home() {
  const cafes = getRankedCafes();
  const top = cafes[0];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <section className="mb-10 max-w-2xl">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Every London café I&apos;ve been to, ranked.</h1>
        <p className="mt-4 text-lg text-stone-600">
          Scored on coffee, food, vibe, value and how laptop-friendly they are. {cafes.length} {cafes.length === 1 ? "café" : "cafés"} so far
          {top && (
            <>
              {" "}
              — current #1 is <strong>{top.name}</strong>
            </>
          )}
          . Been to one? Add your own review on its page.
        </p>
        <p className="mt-3 text-stone-600">
          Somewhere I haven&apos;t been?{" "}
          <Link href="/cafes" className="font-medium text-amber-800 underline">
            Browse community cafés
          </Link>{" "}
          or{" "}
          <Link href="/add-cafe" className="font-medium text-amber-800 underline">
            add one
          </Link>{" "}
          for everyone to review.
        </p>
      </section>

      <RankingExplorer cafes={cafes} />
    </main>
  );
}
