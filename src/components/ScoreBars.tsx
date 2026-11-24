import { CATEGORIES } from "@/lib/cafes";
import type { ScoreCategory } from "@/data/cafes";

/** Full breakdown: label, a hairline bar and the score. Unscored categories show a dash. */
export default function ScoreBars({ scores }: { scores: Partial<Record<ScoreCategory, number>> }) {
  return (
    <dl className="space-y-3">
      {CATEGORIES.map(({ key, label }) => (
        <div key={key} className="grid grid-cols-[8.5rem_1fr_2rem] items-center gap-4">
          <dt className="text-sm text-ink-soft">{label}</dt>
          <dd className="contents">
            <div className="h-px w-full bg-rule">
              <div className="h-[3px] -translate-y-px bg-brass" style={{ width: `${(scores[key] ?? 0) * 10}%` }} />
            </div>
            <span className="figures text-right text-lg text-pop">{scores[key] ?? "–"}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** One-line summary for list rows: "Coffee 10  Food 9  Vibe 9". */
export function ScoreLine({ scores }: { scores: Partial<Record<ScoreCategory, number>> }) {
  return (
    <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft">
      {CATEGORIES.filter(({ key }) => scores[key] !== undefined).map(({ key, label }) => (
        <span key={key}>
          {label} <span className="font-semibold text-pop tabular-nums">{scores[key]}</span>
        </span>
      ))}
    </p>
  );
}
