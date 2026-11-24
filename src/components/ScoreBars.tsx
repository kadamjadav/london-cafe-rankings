import { CATEGORIES } from "@/lib/cafes";
import type { ScoreCategory } from "@/data/cafes";

export default function ScoreBars({
  scores,
  compact = false,
}: {
  scores: Partial<Record<ScoreCategory, number>>;
  compact?: boolean;
}) {
  return (
    <dl className={compact ? "grid grid-cols-5 gap-2" : "space-y-2"}>
      {CATEGORIES.map(({ key, label }) => (
        <div key={key} className={compact ? "" : "grid grid-cols-[120px_1fr_32px] items-center gap-3"}>
          <dt className={compact ? "text-[11px] text-stone-500 truncate" : "text-sm text-stone-600"}>
            {label}
          </dt>
          <dd className={compact ? "mt-1" : "contents"}>
            <div className="h-1.5 w-full rounded-full bg-stone-200">
              <div
                className="h-1.5 rounded-full bg-amber-700"
                style={{ width: `${(scores[key] ?? 0) * 10}%` }}
              />
            </div>
            {!compact && <span className="text-right text-sm font-medium tabular-nums">{scores[key] ?? "–"}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}
