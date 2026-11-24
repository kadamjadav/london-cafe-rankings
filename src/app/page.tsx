import RankingExplorer from "@/components/RankingExplorer";
import { getRankedCafes, hasSampleData } from "@/lib/cafes";

export default function Home() {
  const cafes = getRankedCafes();
  const top = cafes[0];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      {hasSampleData() && (
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Showing <strong>sample data</strong>. Edit <code>src/data/cafes.ts</code> to add the cafés you&apos;ve
          actually visited, then delete the sample entries.
        </div>
      )}

      <section className="mb-10 max-w-2xl">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Every London café I&apos;ve been to, ranked.</h1>
        <p className="mt-4 text-lg text-stone-600">
          Scored on coffee, food, vibe, value and how laptop-friendly they are. {cafes.length} cafés so far
          {top && (
            <>
              {" "}
              — current #1 is <strong>{top.name}</strong>
            </>
          )}
          . Been to one? Add your own review on its page.
        </p>
      </section>

      <RankingExplorer cafes={cafes} />
    </main>
  );
}
