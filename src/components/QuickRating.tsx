"use client";

import { useCallback, useEffect, useState } from "react";
import type { ScoreCategory } from "@/data/cafes";
import { CATEGORIES } from "@/lib/cafes";
import { fetchCafeRatings, summarise, type CommunityScore, type RatingRow } from "@/lib/ratings";
import { getSupabase } from "@/lib/supabase";
import { useUser } from "@/lib/useSession";

type Draft = Partial<Record<ScoreCategory, number | null>>;

/**
 * Score a café out of 10 per category, no writing required.
 * Shows the community average to everyone; signed-in visitors get the scoring panel.
 */
export default function QuickRating({ cafeSlug, ownerScore }: { cafeSlug: string; ownerScore?: number }) {
  const supabase = getSupabase();
  const { user } = useUser();
  const [rows, setRows] = useState<RatingRow[]>([]);
  const [draft, setDraft] = useState<Draft>({});
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    fetchCafeRatings(cafeSlug).then(setRows);
  }, [cafeSlug]);

  useEffect(() => {
    if (supabase) load();
  }, [supabase, load]);

  if (!supabase) return null;

  const score: CommunityScore | null = summarise(rows);
  const mine = user ? rows.find((r) => r.user_id === user.id) : undefined;

  function startEditing() {
    setDraft(mine ? Object.fromEntries(CATEGORIES.map((c) => [c.key, mine[c.key] ?? null])) : {});
    setMsg(null);
    setOpen(true);
  }

  async function save() {
    const values = Object.fromEntries(CATEGORIES.map((c) => [c.key, draft[c.key] ?? null]));
    if (Object.values(values).every((v) => v === null)) return setMsg("Score at least one category.");
    setSaving(true);
    const { error } = mine
      ? await supabase!
          .from("ratings")
          .update({ ...values, updated_at: new Date().toISOString() })
          .eq("cafe_slug", cafeSlug)
          .eq("user_id", user!.id)
      : await supabase!.from("ratings").insert({ cafe_slug: cafeSlug, ...values });
    setSaving(false);
    if (error) return setMsg(error.message);
    setOpen(false);
    load();
  }

  async function remove() {
    if (!confirm("Remove your rating for this café?")) return;
    await supabase!.from("ratings").delete().eq("cafe_slug", cafeSlug).eq("user_id", user!.id);
    setOpen(false);
    load();
  }

  return (
    <section className="rating-panel" aria-labelledby="community-score-heading">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h2 id="community-score-heading" className="font-display text-2xl">
            Visitors&apos; score
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            {score
              ? `Average from ${score.raters} ${score.raters === 1 ? "person" : "people"}${
                  ownerScore !== undefined ? `, compared with Kadam's ${ownerScore.toFixed(1)}` : ""
                }.`
              : "Nobody has scored this café yet."}
          </p>
        </div>
        <p className="figures text-5xl leading-none  text-pop">
          {score ? score.overall.toFixed(1) : "–"}
          <span className="ml-1 font-sans text-base text-ink-soft">/10</span>
        </p>
      </div>

      {score && (
        <dl className="mt-6 grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-5">
          {CATEGORIES.map(({ key, label }) => {
            const c = score.categories[key];
            return (
              <div key={key}>
                <dt className="text-xs text-ink-soft">{label}</dt>
                <dd className="mt-0.5 flex items-baseline gap-1.5">
                  <span className="figures text-xl text-pop">{c ? c.avg.toFixed(1) : "–"}</span>
                  {c && <span className="text-xs text-ink-soft">({c.n})</span>}
                </dd>
              </div>
            );
          })}
        </dl>
      )}

      {!user ? (
        <p className="mt-6 text-sm text-ink-soft">Sign in to add your own score. No review needed.</p>
      ) : !open ? (
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <button onClick={startEditing} className="btn-primary">
            {mine ? "Change your score" : "Score this café"}
          </button>
          {mine && <span className="text-sm text-ink-soft">You&apos;ve scored this café.</span>}
        </div>
      ) : (
        <div className="mt-6 space-y-4 border-t border-rule pt-6">
          <p className="text-sm text-ink-soft">Tap a number for each category you can judge. Leave the rest blank.</p>
          {CATEGORIES.map(({ key, label }) => (
            <fieldset key={key} className="grid items-center gap-2 sm:grid-cols-[140px_1fr]">
              <legend className="contents">
                <span className="text-sm font-medium">{label}</span>
              </legend>
              <div className="flex flex-wrap gap-1" role="radiogroup" aria-label={`${label} score`}>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
                  const active = draft[key] === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      aria-label={`${label} ${n} out of 10`}
                      onClick={() => setDraft((d) => ({ ...d, [key]: active ? null : n }))}
                      className={`score-chip ${active ? "score-chip--on" : ""}`}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button onClick={save} disabled={saving} className="btn-primary">
              {saving ? "Saving…" : "Save score"}
            </button>
            <button onClick={() => setOpen(false)} className="text-sm text-ink-soft underline">
              Cancel
            </button>
            {mine && (
              <button onClick={remove} className="text-sm text-red-800 underline">
                Remove my score
              </button>
            )}
            {msg && <p className="text-sm text-red-800">{msg}</p>}
          </div>
        </div>
      )}
    </section>
  );
}
