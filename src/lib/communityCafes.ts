"use client";

import { getRankedCafes } from "./cafes";
import { getSupabase } from "./supabase";

export type CommunityCafe = {
  id: string;
  slug: string;
  name: string;
  area: string;
  address: string | null;
  lat: number;
  lng: number;
  added_by: string;
  created_at: string;
  profiles?: { display_name: string } | null;
};

export type ReviewStats = { count: number; avg: number | null };

/** Community cafés are prefixed "c-" so their URLs can never clash with Kadam's. */
export function isCommunitySlug(slug: string) {
  return slug.startsWith("c-");
}

export function cafeHref(slug: string) {
  return isCommunitySlug(slug) ? `/place?slug=${slug}` : `/cafe/${slug}`;
}

export function slugify(name: string, area: string) {
  const base = `${name} ${area}`
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
  return `c-${base || "cafe"}`;
}

export const COMMUNITY_SELECT =
  "id, slug, name, area, address, lat, lng, added_by, created_at, profiles!community_cafes_added_by_fkey(display_name)";

/** Review count and average star rating for every café slug that has reviews. */
export async function fetchReviewStats(): Promise<Map<string, ReviewStats>> {
  const supabase = getSupabase();
  const stats = new Map<string, ReviewStats>();
  if (!supabase) return stats;
  const { data } = await supabase.from("reviews").select("cafe_slug, rating");
  const sums = new Map<string, { n: number; total: number }>();
  for (const r of (data as { cafe_slug: string; rating: number }[]) ?? []) {
    const s = sums.get(r.cafe_slug) ?? { n: 0, total: 0 };
    s.n += 1;
    s.total += r.rating;
    sums.set(r.cafe_slug, s);
  }
  for (const [slug, s] of sums) stats.set(slug, { count: s.n, avg: Math.round((s.total / s.n) * 10) / 10 });
  return stats;
}

export async function fetchCommunityCafes(): Promise<CommunityCafe[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data } = await supabase.from("community_cafes").select(COMMUNITY_SELECT).order("created_at", { ascending: false });
  return (data as unknown as CommunityCafe[]) ?? [];
}

/** Every café on the site — Kadam's picks and community-added — in one shape. */
export type AnyCafe = {
  slug: string;
  name: string;
  area: string;
  lat: number;
  lng: number;
  href: string;
  source: "owner" | "community";
  ownerRank?: number;
  ownerScore?: number;
  addedBy?: { id: string; name: string };
  createdAt?: string;
};

export function mergeCafes(community: CommunityCafe[]): AnyCafe[] {
  const owner: AnyCafe[] = getRankedCafes().map((c) => ({
    slug: c.slug,
    name: c.name,
    area: c.area,
    lat: c.lat,
    lng: c.lng,
    href: `/cafe/${c.slug}`,
    source: "owner",
    ownerRank: c.rank,
    ownerScore: c.overall,
  }));
  const comm: AnyCafe[] = community.map((c) => ({
    slug: c.slug,
    name: c.name,
    area: c.area,
    lat: c.lat,
    lng: c.lng,
    href: cafeHref(c.slug),
    source: "community",
    addedBy: { id: c.added_by, name: c.profiles?.display_name ?? "someone" },
    createdAt: c.created_at,
  }));
  return [...owner, ...comm];
}
