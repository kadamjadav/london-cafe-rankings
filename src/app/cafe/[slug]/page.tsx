import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Community from "@/components/Community";
import MapClient from "@/components/MapClient";
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
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <Link href="/" className="text-sm text-stone-500 hover:underline">
        ← All rankings
      </Link>

      <header className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-amber-800">
            Ranked #{cafe.rank} of {total}
          </p>
          <h1 className="text-4xl font-bold tracking-tight">{cafe.name}</h1>
          <p className="mt-1 text-stone-500">
            {cafe.address ?? cafe.area} · visited {formatDate(cafe.visited)}
          </p>
        </div>
        <div className="text-right">
          <div className="text-5xl font-bold tabular-nums text-amber-800">{cafe.overall.toFixed(1)}</div>
          <div className="text-sm text-stone-500">out of 10</div>
        </div>
      </header>

      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <div className="space-y-6">
          <ScoreBars scores={cafe.scores} />
          <div>
            <p className="text-lg font-medium">{cafe.verdict}</p>
            {cafe.review && <p className="mt-3 whitespace-pre-line text-stone-700">{cafe.review}</p>}
            {cafe.mustOrder && (
              <p className="mt-4 text-sm">
                <span className="font-semibold">Must order:</span> {cafe.mustOrder}
              </p>
            )}
          </div>
        </div>
        <MapClient
          cafes={[cafe]}
          selected={cafe.slug}
          height={320}
          zoom={15}
          center={[cafe.lat, cafe.lng]}
        />
      </div>

      {cafe.photos && cafe.photos.length > 0 && (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {cafe.photos.map((src) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={src} alt={`${cafe.name}`} className="aspect-square w-full rounded-xl object-cover" />
          ))}
        </div>
      )}

      <div className="mt-14">
        <Community cafeSlug={cafe.slug} />
      </div>
    </main>
  );
}
