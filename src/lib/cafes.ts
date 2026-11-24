import { cafes, type Cafe, type ScoreCategory } from "@/data/cafes";

export const CATEGORIES: { key: ScoreCategory; label: string }[] = [
  { key: "coffee", label: "Coffee" },
  { key: "food", label: "Food" },
  { key: "vibe", label: "Vibe" },
  { key: "value", label: "Value" },
  { key: "laptop", label: "Laptop-friendly" },
];

export type RankedCafe = Cafe & { overall: number; rank: number };

/** Average of the categories that have been scored (unscored ones are ignored). */
export function overallScore(cafe: Cafe): number {
  const values = CATEGORIES.map((c) => cafe.scores[c.key]).filter((v): v is number => v !== undefined);
  if (values.length === 0) return 0;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.round(avg * 10) / 10;
}

/** All cafés, ranked by overall score (ties broken by coffee score, then most recent visit). */
export function getRankedCafes(): RankedCafe[] {
  return cafes
    .map((c) => ({ ...c, overall: overallScore(c) }))
    .sort(
      (a, b) =>
        b.overall - a.overall ||
        (b.scores.coffee ?? 0) - (a.scores.coffee ?? 0) ||
        b.visited.localeCompare(a.visited),
    )
    .map((c, i) => ({ ...c, rank: i + 1 }));
}

export function getCafe(slug: string): RankedCafe | undefined {
  return getRankedCafes().find((c) => c.slug === slug);
}

export function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
