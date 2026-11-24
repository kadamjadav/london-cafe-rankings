"use client";

import type { ScoreCategory } from "@/data/cafes";
import { CATEGORIES } from "./cafes";
import { getSupabase } from "./supabase";

export type RatingRow = { cafe_slug: string; user_id: string } & Partial<Record<ScoreCategory, number | null>>;

export type CommunityScore = {
  /** Number of people who rated. */
  raters: number;
  /** Average of each rater's own overall (the mean of the categories they scored), 1 decimal. */
  overall: number;
  /** Per-category average and how many people scored that category. */
  categories: Partial<Record<ScoreCategory, { avg: number; n: number }>>;
};

const round1 = (x: number) => Math.round(x * 10) / 10;

export function summarise(rows: RatingRow[]): CommunityScore | null {
  if (rows.length === 0) return null;
  const perRater: number[] = [];
  const cats: Partial<Record<ScoreCategory, { total: number; n: number }>> = {};
  for (const r of rows) {
    const scored = CATEGORIES.map((c) => r[c.key]).filter((v): v is number => typeof v === "number");
    if (scored.length) perRater.push(scored.reduce((a, b) => a + b, 0) / scored.length);
    for (const { key } of CATEGORIES) {
      const v = r[key];
      if (typeof v !== "number") continue;
      const c = (cats[key] ??= { total: 0, n: 0 });
      c.total += v;
      c.n += 1;
    }
  }
  const categories: CommunityScore["categories"] = {};
  for (const { key } of CATEGORIES) {
    const c = cats[key];
    if (c) categories[key] = { avg: round1(c.total / c.n), n: c.n };
  }
  return {
    raters: perRater.length,
    overall: round1(perRater.reduce((a, b) => a + b, 0) / perRater.length),
    categories,
  };
}

const COLS = "cafe_slug, user_id, coffee, food, vibe, value, laptop";

/** Community score for every café that has at least one rating. */
export async function fetchAllScores(): Promise<Map<string, CommunityScore>> {
  const supabase = getSupabase();
  const out = new Map<string, CommunityScore>();
  if (!supabase) return out;
  const { data } = await supabase.from("ratings").select(COLS);
  const bySlug = new Map<string, RatingRow[]>();
  for (const r of (data as RatingRow[]) ?? []) {
    const list = bySlug.get(r.cafe_slug) ?? [];
    list.push(r);
    bySlug.set(r.cafe_slug, list);
  }
  for (const [slug, rows] of bySlug) {
    const s = summarise(rows);
    if (s) out.set(slug, s);
  }
  return out;
}

export async function fetchCafeRatings(slug: string): Promise<RatingRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data } = await supabase.from("ratings").select(COLS).eq("cafe_slug", slug);
  return (data as RatingRow[]) ?? [];
}
