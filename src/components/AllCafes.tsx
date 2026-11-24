"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import MapClient from "./MapClient";
import { formatDate } from "@/lib/cafes";
import {
  fetchCommunityCafes,
  fetchReviewStats,
  mergeCafes,
  type AnyCafe,
  type ReviewStats,
} from "@/lib/communityCafes";
import { getSupabase } from "@/lib/supabase";

type Sort = "reviews" | "rating" | "newest" | "name";

export default function AllCafes() {
  const configured = getSupabase() !== null;
  const [cafes, setCafes] = useState<AnyCafe[]>(() => mergeCafes([]));
  const [stats, setStats] = useState<Map<string, ReviewStats>>(new Map());
  const [loading, setLoading] = useState(configured);
  const [query, setQuery] = useState("");
  const [show, setShow] = useState<"all" | "owner" | "community">("all");
  const [sort, setSort] = useState<Sort>("reviews");
  const [selected, setSelected] = useState<string | undefined>();

  useEffect(() => {
    if (!configured) return;
    Promise.all([fetchCommunityCafes(), fetchReviewStats()]).then(([community, s]) => {
      setCafes(mergeCafes(community));
      setStats(s);
      setLoading(false);
    });
  }, [configured]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = cafes.filter(
      (c) => (show === "all" || c.source === show) && (!q || `${c.name} ${c.area}`.toLowerCase().includes(q)),
    );
    const n = (c: AnyCafe) => stats.get(c.slug)?.count ?? 0;
    const avg = (c: AnyCafe) => stats.get(c.slug)?.avg ?? 0;
    return list.sort((a, b) => {
      if (sort === "reviews") return n(b) - n(a) || avg(b) - avg(a) || a.name.localeCompare(b.name);
      if (sort === "rating") return avg(b) - avg(a) || n(b) - n(a);
      if (sort === "newest") return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
      return a.name.localeCompare(b.name);
    });
  }, [cafes, stats, query, show, sort]);

  const mapCafes = visible.map((c) => {
    const s = stats.get(c.slug);
    return {
      slug: c.slug,
      name: c.name,
      area: c.area,
      lat: c.lat,
      lng: c.lng,
      href: c.href,
      rank: c.ownerRank,
      overall: c.ownerScore,
      subtitle: s ? `${s.avg}★ from ${s.count}` : "no reviews yet",
    };
  });

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="text-4xl font-bold tracking-tight">All cafés</h1>
          <p className="mt-3 text-lg text-stone-600">
            Kadam&apos;s picks plus every café the community has added. Been somewhere that isn&apos;t here? Add it, and
            anyone can review it.
          </p>
        </div>
        <Link
          href="/add-cafe"
          className="rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-stone-700"
        >
          + Add a café
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
        <div className="lg:sticky lg:top-6 lg:self-start">
          <MapClient cafes={mapCafes} selected={selected} onSelect={setSelected} />
          <p className="mt-2 text-xs text-stone-500">Numbered pins are Kadam&apos;s ranking; ☕ pins were added by the community.</p>
        </div>

        <div>
          <div className="mb-4 flex flex-wrap gap-2">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search cafés or areas…"
              aria-label="Search cafés"
              className="min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
            />
            <select
              value={show}
              onChange={(e) => setShow(e.target.value as typeof show)}
              aria-label="Which cafés"
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
            >
              <option value="all">All cafés</option>
              <option value="owner">Kadam&apos;s picks</option>
              <option value="community">Community-added</option>
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              aria-label="Sort by"
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
            >
              <option value="reviews">Most reviewed</option>
              <option value="rating">Highest rated by visitors</option>
              <option value="newest">Recently added</option>
              <option value="name">A–Z</option>
            </select>
          </div>

          {loading && <p className="mb-3 text-sm text-stone-500">Loading community cafés…</p>}

          {visible.length === 0 ? (
            <div className="rounded-xl border border-dashed border-stone-300 p-8 text-center text-stone-500">
              <p>No cafés match that.</p>
              <Link href="/add-cafe" className="mt-2 inline-block font-medium text-amber-800 underline">
                Add it yourself
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {visible.map((c) => {
                const s = stats.get(c.slug);
                return (
                  <li key={c.slug}>
                    <article
                      onClick={() => setSelected(c.slug)}
                      className={`cursor-pointer rounded-2xl border bg-white p-4 transition hover:border-stone-400 ${
                        selected === c.slug ? "border-amber-700 shadow-md" : "border-stone-200"
                      }`}
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <h2 className="truncate text-lg font-semibold">
                          <Link href={c.href} className="hover:underline">
                            {c.name}
                          </Link>
                        </h2>
                        {c.source === "owner" ? (
                          <span className="shrink-0 rounded-full bg-stone-900 px-2.5 py-0.5 text-xs font-medium text-amber-100">
                            Kadam&apos;s #{c.ownerRank}
                          </span>
                        ) : (
                          <span className="shrink-0 rounded-full border border-amber-700 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                            Community
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-stone-500">
                        {c.area}
                        {c.addedBy && (
                          <>
                            {" "}
                            · added by{" "}
                            <Link href={`/profile?id=${c.addedBy.id}`} className="underline">
                              {c.addedBy.name}
                            </Link>
                            {c.createdAt && <> on {formatDate(c.createdAt.slice(0, 10))}</>}
                          </>
                        )}
                      </p>
                      <p className="mt-2 text-sm">
                        {s ? (
                          <>
                            <span className="font-medium text-amber-700">{"★".repeat(Math.round(s.avg ?? 0))}</span>{" "}
                            {s.avg} from {s.count} {s.count === 1 ? "review" : "reviews"}
                          </>
                        ) : (
                          <Link href={c.href} className="text-stone-500 underline">
                            No reviews yet — be the first
                          </Link>
                        )}
                      </p>
                    </article>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
