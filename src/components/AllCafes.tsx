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
import { fetchAllScores, type CommunityScore } from "@/lib/ratings";
import { getSupabase } from "@/lib/supabase";

type Sort = "score" | "reviews" | "newest" | "name";

export default function AllCafes() {
  const configured = getSupabase() !== null;
  const [cafes, setCafes] = useState<AnyCafe[]>(() => mergeCafes([]));
  const [stats, setStats] = useState<Map<string, ReviewStats>>(new Map());
  const [scores, setScores] = useState<Map<string, CommunityScore>>(new Map());
  const [loading, setLoading] = useState(configured);
  const [query, setQuery] = useState("");
  const [show, setShow] = useState<"all" | "owner" | "community">("all");
  const [sort, setSort] = useState<Sort>("score");
  const [selected, setSelected] = useState<string | undefined>();

  useEffect(() => {
    if (!configured) return;
    Promise.all([fetchCommunityCafes(), fetchReviewStats(), fetchAllScores()]).then(([community, s, sc]) => {
      setCafes(mergeCafes(community));
      setStats(s);
      setScores(sc);
      setLoading(false);
    });
  }, [configured]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = cafes.filter(
      (c) => (show === "all" || c.source === show) && (!q || `${c.name} ${c.area}`.toLowerCase().includes(q)),
    );
    const n = (c: AnyCafe) => stats.get(c.slug)?.count ?? 0;
    const sc = (c: AnyCafe) => scores.get(c.slug)?.overall ?? -1;
    const raters = (c: AnyCafe) => scores.get(c.slug)?.raters ?? 0;
    return list.sort((a, b) => {
      if (sort === "score") return sc(b) - sc(a) || raters(b) - raters(a) || n(b) - n(a);
      if (sort === "reviews") return n(b) - n(a) || sc(b) - sc(a) || a.name.localeCompare(b.name);
      if (sort === "newest") return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
      return a.name.localeCompare(b.name);
    });
  }, [cafes, stats, scores, query, show, sort]);

  const mapCafes = visible.map((c) => {
    const v = scores.get(c.slug);
    return {
      slug: c.slug,
      name: c.name,
      area: c.area,
      lat: c.lat,
      lng: c.lng,
      href: c.href,
      rank: c.ownerRank,
      overall: c.ownerScore,
      subtitle: v ? `visitors ${v.overall.toFixed(1)}/10` : "not scored yet",
    };
  });

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="font-display text-5xl leading-[1.05] sm:text-6xl">All cafés</h1>
          <p className="mt-3 text-lg text-ink-soft">
            Kadam&apos;s picks plus every café the community has added. Been somewhere that isn&apos;t here? Add it, and
            anyone can review it.
          </p>
        </div>
        <Link
          href="/add-cafe"
          className="btn-primary"
        >
          Add a café
        </Link>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1.25fr_1fr]">
        <div className="order-2 lg:sticky lg:top-6 lg:self-start">
          <MapClient cafes={mapCafes} selected={selected} onSelect={setSelected} />
          <p className="mt-2 text-xs text-ink-soft">Numbered pins are Kadam&apos;s picks. Cup pins were added by visitors.</p>
        </div>

        <div className="order-1">
          <p className="mb-3 text-sm text-ink-soft">Scores on the right are the visitors&apos; average out of 10.</p>
          <div className="mb-6 flex flex-wrap gap-2">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search cafés or areas…"
              aria-label="Search cafés"
              className="min-w-0 basis-full rounded-[3px] border border-rule bg-porcelain px-3 py-2 text-sm sm:basis-auto sm:flex-1"
            />
            <select
              value={show}
              onChange={(e) => setShow(e.target.value as typeof show)}
              aria-label="Which cafés"
              className="rounded-[3px] border border-rule bg-porcelain px-3 py-2 text-sm"
            >
              <option value="all">All cafés</option>
              <option value="owner">Kadam&apos;s picks</option>
              <option value="community">Community-added</option>
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              aria-label="Sort by"
              className="rounded-[3px] border border-rule bg-porcelain px-3 py-2 text-sm"
            >
              <option value="score">Highest visitor score</option>
              <option value="reviews">Most reviewed</option>
              <option value="newest">Recently added</option>
              <option value="name">A–Z</option>
            </select>
          </div>

          {loading && <p className="mb-3 text-sm text-ink-soft">Loading community cafés…</p>}

          {visible.length === 0 ? (
            <div className="border-y border-rule py-10 text-center text-ink-soft">
              <p>No cafés match that.</p>
              <Link href="/add-cafe" className="mt-2 inline-block text-pop underline underline-offset-2">
                Add it yourself
              </Link>
            </div>
          ) : (
            <ul className="border-t border-rule">
              {visible.map((c) => {
                const r = stats.get(c.slug);
                const v = scores.get(c.slug);
                return (
                  <li key={c.slug} className="border-b border-rule">
                    <article
                      onClick={() => setSelected(c.slug)}
                      className={`cursor-pointer px-1 py-5 transition-colors ${selected === c.slug ? "bg-porcelain" : ""}`}
                    >
                      <div className="menu-line">
                        <h2 className="font-display text-2xl leading-tight">
                          <Link href={c.href} className="hover:text-pop">
                            {c.name}
                          </Link>
                        </h2>
                        <span className="menu-leader" aria-hidden />
                        <span
                          className="figures text-2xl "
                          title={v ? `Visitors' score from ${v.raters} ${v.raters === 1 ? "person" : "people"}` : undefined}
                        >
                          {v ? v.overall.toFixed(1) : "–"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-ink-soft">
                        {c.area}
                        {c.source === "owner" ? (
                          <>
                            . <span className="text-brass">Kadam&apos;s number {c.ownerRank}</span>, scored{" "}
                            {c.ownerScore?.toFixed(1)}
                          </>
                        ) : (
                          c.addedBy && (
                            <>
                              . Added by{" "}
                              <Link href={`/profile?id=${c.addedBy.id}`} className="underline underline-offset-2">
                                {c.addedBy.name}
                              </Link>
                              {c.createdAt && <> on {formatDate(c.createdAt.slice(0, 10))}</>}
                            </>
                          )
                        )}
                      </p>
                      <p className="mt-2 text-sm text-ink-soft">
                        {v || r ? (
                          <>
                            {v && `Scored by ${v.raters} ${v.raters === 1 ? "person" : "people"}`}
                            {v && r && ", "}
                            {r && `${r.count} ${r.count === 1 ? "review" : "reviews"}`}
                          </>
                        ) : (
                          <Link href={c.href} className="text-pop underline underline-offset-2">
                            Be the first to score it
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
