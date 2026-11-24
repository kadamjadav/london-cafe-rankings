import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Community from "@/components/Community";
import MapClient from "@/components/MapClient";
import QuickRating from "@/components/QuickRating";
import ScoreBars from "@/components/ScoreBars";
import { cafes } from "@/data/cafes";
import { formatDate, getCafe, getRankedCafes } from "@/lib/cafes";

export function generateStaticParams() {
  return cafes.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/cafe/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const cafe = getCafe(slug);
  if (!cafe) return {};
  return {
    title: `#${cafe.rank} ${cafe.name}`,
    description: `${cafe.name} (${cafe.area}) scored ${cafe.overall.toFixed(1)}/10. ${cafe.verdict}`,
  };
}

export default async function CafePage({ params }: PageProps<"/cafe/[slug]">) {
  const { slug } = await params;
  const cafe = getCafe(slug);
  if (!cafe) notFound();
  const total = getRankedCafes().length;

  return (
    <main className="mx-auto w-full max-w-5xl px-5 pb-10 pt-10">
      <Link href="/" className="text-sm text-ink-soft underline-offset-4 hover:text-ink hover:underline">
        Back to the rankings
      </Link>

      <header className="mt-8 grid gap-6 border-b border-rule pb-10 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <p className="text-sm text-brass">
            Kadam&apos;s number {cafe.rank} of {total}
          </p>
          <h1 className="mt-2 font-display text-5xl leading-[1.05] sm:text-6xl">{cafe.name}</h1>
          <p className="mt-3 text-ink-soft">
            {cafe.address ?? cafe.area}. Visited {formatDate(cafe.visited)}.
          </p>
        </div>
        <p className="figures text-7xl leading-none text-awning">
          {cafe.overall.toFixed(1)}
          <span className="ml-1 font-sans text-lg text-ink-soft">/10</span>
        </p>
      </header>

      <div className="mt-10 grid gap-12 md:grid-cols-[1fr_1fr]">
        <div className="space-y-8">
          <div>
            <p className="font-display text-2xl leading-snug">{cafe.verdict}</p>
            {cafe.review && <p className="mt-4 whitespace-pre-line leading-relaxed text-ink">{cafe.review}</p>}
            {cafe.mustOrder && (
              <p className="mt-4 text-ink-soft">
                Order the <span className="text-ink">{cafe.mustOrder.toLowerCase()}</span>.
              </p>
            )}
          </div>
          <ScoreBars scores={cafe.scores} />
        </div>
        <MapClient cafes={[cafe]} selected={cafe.slug} height={340} zoom={15} center={[cafe.lat, cafe.lng]} />
      </div>

      {cafe.photos && cafe.photos.length > 0 && (
        <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {cafe.photos.map((src) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={src} alt={cafe.name} className="aspect-[4/5] w-full rounded-md object-cover" />
          ))}
        </div>
      )}

      <div className="mt-16">
        <QuickRating cafeSlug={cafe.slug} ownerScore={cafe.overall} />
      </div>

      <div className="mt-16">
        <Community cafeSlug={cafe.slug} />
      </div>
    </main>
  );
}
