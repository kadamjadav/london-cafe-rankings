"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import MapClient from "./MapClient";
import ScoreBars from "./ScoreBars";
import { CATEGORIES, formatDate, type RankedCafe } from "@/lib/cafes";
import type { ScoreCategory } from "@/data/cafes";

type SortKey = "overall" | ScoreCategory | "recent";

export default function RankingExplorer({ cafes }: { cafes: RankedCafe[] }) {
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("all");
  const [sort, setSort] = useState<SortKey>("overall");
  const [selected, setSelected] = useState<string | undefined>();

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
    <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
      <div className="lg:sticky lg:top-6 lg:self-start">
        <MapClient cafes={visible} selected={selected} onSelect={setSelected} />
        <p className="mt-2 text-xs text-stone-500">
          Numbers on the pins are the overall ranking. Click a pin or a card to jump to it.
        </p>
      </div>

      <div>
        <div className="mb-4 flex flex-wrap gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search cafés, areas, drinks…"
            className="min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
            aria-label="Search cafés"
          />
          <select
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
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
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
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
          <p className="rounded-xl border border-dashed border-stone-300 p-8 text-center text-stone-500">
            No cafés match that.
          </p>
        ) : (
          <ol className="space-y-3">
            {visible.map((c) => (
              <li key={c.slug}>
                <article
                  onClick={() => setSelected(c.slug)}
                  className={`cursor-pointer rounded-2xl border bg-white p-4 transition hover:border-stone-400 ${
                    selected === c.slug ? "border-amber-700 shadow-md" : "border-stone-200"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-stone-900 text-lg font-bold text-amber-100">
                      {c.rank}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <h3 className="truncate text-lg font-semibold">
                          <Link href={`/cafe/${c.slug}`} className="hover:underline">
                            {c.name}
                          </Link>
                        </h3>
                        <span className="shrink-0 text-xl font-bold tabular-nums text-amber-800">
                          {c.overall.toFixed(1)}
                        </span>
                      </div>
                      <p className="text-sm text-stone-500">
                        {c.area} · visited {formatDate(c.visited)}
                        {c.mustOrder && <> · order the {c.mustOrder.toLowerCase()}</>}
                      </p>
                      <p className="mt-2 text-sm text-stone-700">{c.verdict}</p>
                      <div className="mt-3">
                        <ScoreBars scores={c.scores} compact />
                      </div>
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
