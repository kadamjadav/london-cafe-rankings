import Link from "next/link";
import RankingExplorer from "@/components/RankingExplorer";
import { getRankedCafes } from "@/lib/cafes";

export default function Home() {
  const cafes = getRankedCafes();

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-10 pt-14">
      <section className="mb-14 grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-end">
        <h1 className="font-display text-5xl leading-[1.02] sm:text-7xl">
          Every London café I&apos;ve been to, ranked.
        </h1>
        <div className="space-y-4 text-[1.05rem] leading-relaxed text-ink-soft lg:pb-2">
          <p>
            {cafes.length} {cafes.length === 1 ? "café" : "cafés"} so far, each scored out of ten for coffee, food,
            vibe, value and how easy it is to work from.
          </p>
          <p>
            Been somewhere I haven&apos;t?{" "}
            <Link href="/add-cafe" className="text-pop underline underline-offset-4 hover:text-pop-deep">
              Add it
            </Link>{" "}
            and anyone can score or review it, or{" "}
            <Link href="/cafes" className="text-pop underline underline-offset-4 hover:text-pop-deep">
              browse every café
            </Link>
            .
          </p>
        </div>
      </section>

      <RankingExplorer cafes={cafes} />
    </main>
  );
}
