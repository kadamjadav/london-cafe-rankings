/**
 * YOUR café rankings live here.
 *
 * To add a café you've visited:
 *   1. Copy one of the objects below.
 *   2. Give it a unique `slug` (lowercase, dashes) — it becomes the URL /cafe/<slug>.
 *   3. Get lat/lng by right-clicking the spot in Google Maps or openstreetmap.org.
 *   4. Score each category out of 10. The overall score (average of the scored categories) and the ranking are calculated for you.
 *   5. Put your own photos in /public/cafes/ and list them as "/cafes/your-photo.jpg".
 *
 * You don't have to score every category — leave one out and it won't count towards the overall score.
 */

export type ScoreCategory = "coffee" | "food" | "vibe" | "value" | "laptop";

export type Cafe = {
  slug: string;
  name: string;
  area: string;
  address?: string;
  lat: number;
  lng: number;
  /** Date you visited, YYYY-MM-DD */
  visited: string;
  scores: Partial<Record<ScoreCategory, number>>;
  /** One-line verdict shown on the ranking card */
  verdict: string;
  /** Longer write-up shown on the café page */
  review?: string;
  mustOrder?: string;
  photos?: string[];
};

export const cafes: Cafe[] = [
  {
    slug: "arome-bakery-soho",
    name: "Arôme Bakery",
    area: "Soho",
    address: "90–92 Shaftesbury Avenue, London W1D 5EA",
    lat: 51.5116,
    lng: -0.1312,
    visited: "2026-11-24",
    // Only score what you've judged. Unscored categories show as "–" and don't count towards the overall.
    scores: { coffee: 10, food: 10 },
    verdict: "Perfect 10 for the pastries and the cold brew.",
    mustOrder: "Cold brew",
    photos: ["/cafes/arome-counter.jpg", "/cafes/arome-cold-brew.jpg"],
  },
];
