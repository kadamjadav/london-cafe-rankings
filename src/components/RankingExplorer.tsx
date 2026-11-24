"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { fetchCommunityCafes, type CommunityCafe } from "@/lib/communityCafes";
import MapClient from "./MapClient";
import { ScoreLine } from "./ScoreBars";
import { CATEGORIES, formatDate, type RankedCafe } from "@/lib/cafes";
import type { ScoreCategory } from "@/data/cafes";

type SortKey = "overall" | ScoreCategory | "recent";

export default function RankingExplorer({ cafes }: { cafes: RankedCafe[] }) {
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("all");
  const [sort, setSort] = useState<SortKey>("overall");
  const [selected, setSelected] = useState<string | undefined>();
  const [community, setCommunity] = useState<CommunityCafe[]>([]);

  useEffect(() => {
    fetchCommunityCafes().then(setCommunity);
  }, []);

  const areas = useMemo(() => [...new Set(cafes.map((c) => c.area))].sort(), [cafes]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = cafes.filter(
      (c) =>
        (area === "all" || c.area === area) &&
        (!q || `${c.name} ${c.area} ${c.mustOrder ?? ""}`.toLowerCase().includes(q)),
    );
    return [...filtered].sort((a, b) => {
      if (sort === "overall") return a.rank - b.rank;
      if (sort === "recent") return b.visited.localeCompare(a.visited);
      return (b.scores[sort] ?? -1) - (a.scores[sort] ?? -1) || a.rank - b.rank;
    });
  }, [cafes, query, area, sort]);

  return (
    <div className="grid gap-10 lg:grid-cols-[1.25fr_1fr]">
      {/* Menu first on phones; map beside it on wide screens. */}
      <div className="order-2 lg:sticky lg:top-6 lg:self-start">
        <MapClient
          cafes={[
            ...visible,
            ...community.map((c) => ({
              slug: c.slug,
              name: c.name,
              area: c.area,
              lat: c.lat,
              lng: c.lng,
              href: `/place?slug=${c.slug}`,
            })),
          ]}
          selected={selected}
          onSelect={setSelected}
        />
        <p className="mt-2 text-xs text-ink-soft">
          Numbered pins are my ranking. Cup pins are other London cafés anyone can score or review.
        </p>
      </div>

      <div className="order-1">
        <div className="mb-6 flex flex-wrap gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search cafés, areas, drinks…"
            className="min-w-0 basis-full rounded-[3px] border border-rule bg-porcelain px-3 py-2 text-sm sm:basis-auto sm:flex-1"
            aria-label="Search cafés"
          />
          <select
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className="rounded-[3px] border border-rule bg-porcelain px-3 py-2 text-sm"
            aria-label="Filter by area"
          >
            <option value="all">All areas</option>
            {areas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-[3px] border border-rule bg-porcelain px-3 py-2 text-sm"
            aria-label="Sort by"
          >
            <option value="overall">Best overall</option>
            {CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                Best {c.label.toLowerCase()}
              </option>
            ))}
            <option value="recent">Most recent visit</option>
          </select>
        </div>

        {visible.length === 0 ? (
          <p className="border-y border-rule py-10 text-center text-ink-soft">No cafés match that search.</p>
        ) : (
          /* The menu board: rank, name, a dotted leader, then the score, like prices on a café menu. */
          <ol className="border-t border-rule">
            {visible.map((c) => (
              <li key={c.slug} className="border-b border-rule">
                <article
                  onClick={() => setSelected(c.slug)}
                  className={`grid cursor-pointer grid-cols-[2.75rem_1fr] gap-x-4 py-6 transition-colors sm:grid-cols-[3.5rem_1fr] ${
                    selected === c.slug ? "bg-porcelain" : ""
                  }`}
                >
                  <span className="pl-1 figures text-4xl leading-none text-pop sm:text-5xl">{c.rank}</span>
                  <div className="min-w-0 pr-1">
                    <div className="menu-line">
                      <h3 className="font-display text-2xl leading-tight sm:text-[1.75rem]">
                        <Link href={`/cafe/${c.slug}`} className="hover:text-pop">
                          {c.name}
                        </Link>
                      </h3>
                      <span className="menu-leader" aria-hidden />
                      <span className="figures text-2xl text-pop sm:text-[1.75rem]">
                        {c.overall.toFixed(1)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-ink-soft">
                      {c.area}, visited {formatDate(c.visited)}
                    </p>
                    <p className="mt-3 max-w-prose leading-relaxed">{c.verdict}</p>
                    {c.mustOrder && (
                      <p className="mt-1 text-sm text-ink-soft">
                        Order the <span className="text-ink">{c.mustOrder.toLowerCase()}</span>.
                      </p>
                    )}
                    <div className="mt-3">
                      <ScoreLine scores={c.scores} />
                    </div>
                  </div>
                </article>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
