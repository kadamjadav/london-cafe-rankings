/**
 * YOUR café rankings live here.
 *
 * To add a café you've visited:
 *   1. Copy one of the objects below.
 *   2. Give it a unique `slug` (lowercase, dashes) — it becomes the URL /cafe/<slug>.
 *   3. Get lat/lng by right-clicking the spot in Google Maps or openstreetmap.org.
 *   4. Score each category out of 10. The overall score and the ranking are calculated for you.
 *   5. Put your own photos in /public/cafes/ and list them as "/cafes/your-photo.jpg".
 *
 * The entries marked `sample: true` are placeholders so the site isn't empty.
 * Delete them once you've added your first real café — the "sample data" banner disappears automatically.
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
  scores: Record<ScoreCategory, number>;
  /** One-line verdict shown on the ranking card */
  verdict: string;
  /** Longer write-up shown on the café page */
  review?: string;
  mustOrder?: string;
  photos?: string[];
  sample?: boolean;
};

export const cafes: Cafe[] = [
  {
    slug: "sample-cafe-shoreditch",
    name: "Sample Café — Shoreditch",
    area: "Shoreditch",
    lat: 51.5245,
    lng: -0.078,
    visited: "2026-11-01",
    scores: { coffee: 9, food: 7, vibe: 8, value: 6, laptop: 7 },
    verdict: "Placeholder entry — replace with a café you've actually visited.",
    review:
      "This is sample text. Write what the coffee tasted like, what the room felt like, how busy it was, and whether you'd go back.",
    mustOrder: "Flat white",
    sample: true,
  },
  {
    slug: "sample-cafe-soho",
    name: "Sample Café — Soho",
    area: "Soho",
    lat: 51.5136,
    lng: -0.1365,
    visited: "2026-11-05",
    scores: { coffee: 8, food: 8, vibe: 9, value: 5, laptop: 4 },
    verdict: "Placeholder entry — replace with a café you've actually visited.",
    mustOrder: "Cortado",
    sample: true,
  },
  {
    slug: "sample-cafe-brixton",
    name: "Sample Café — Brixton",
    area: "Brixton",
    lat: 51.4613,
    lng: -0.1156,
    visited: "2026-11-12",
    scores: { coffee: 7, food: 9, vibe: 7, value: 8, laptop: 6 },
    verdict: "Placeholder entry — replace with a café you've actually visited.",
    sample: true,
  },
  {
    slug: "sample-cafe-camden",
    name: "Sample Café — Camden",
    area: "Camden",
    lat: 51.539,
    lng: -0.1426,
    visited: "2026-11-20",
    scores: { coffee: 6, food: 6, vibe: 8, value: 7, laptop: 9 },
    verdict: "Placeholder entry — replace with a café you've actually visited.",
    sample: true,
  },
];
