"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getSupabase, PHOTO_BUCKET } from "@/lib/supabase";
import { cafeHref } from "@/lib/communityCafes";
import { useUser } from "@/lib/useSession";

type Report = {
  id: string;
  target_type: "review" | "comment" | "cafe";
  target_id: string;
  reason: string;
  created_at: string;
};

type Target = { body: string; cafe_slug?: string; photo_path?: string | null } | null;

async function fetchTarget(supabase: NonNullable<ReturnType<typeof getSupabase>>, r: Report): Promise<Target> {
  if (r.target_type === "review") {
    const { data } = await supabase.from("reviews").select("body, cafe_slug, photo_path").eq("id", r.target_id).maybeSingle();
    return data as Target;
  }
  if (r.target_type === "comment") {
    const { data } = await supabase.from("comments").select("body").eq("id", r.target_id).maybeSingle();
    return data as Target;
  }
  const { data } = await supabase.from("community_cafes").select("name, area, slug").eq("id", r.target_id).maybeSingle();
  return data ? { body: `Café: ${data.name} (${data.area})`, cafe_slug: data.slug } : null;
}

export default function AdminPage() {
  const supabase = getSupabase();
  const { user, loading } = useUser();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [reports, setReports] = useState<(Report & { target: Target })[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("reports")
      .select("id, target_type, target_id, reason, created_at")
      .eq("resolved", false)
      .order("created_at", { ascending: true });
    if (error) return setMsg(error.message);
    const withTargets = await Promise.all(
      (data as Report[]).map(async (r) => ({ ...r, target: await fetchTarget(supabase, r) })),
    );
    setReports(withTargets);
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !user) return;
    supabase.rpc("is_admin").then(({ data }) => {
      setIsAdmin(Boolean(data));
      if (data) load();
    });
  }, [supabase, user, load]);

  async function resolve(id: string) {
    await supabase!.from("reports").update({ resolved: true }).eq("id", id);
    load();
  }

  async function removeContent(r: Report & { target: Target }) {
    if (!confirm(r.target_type === "cafe" ? "Delete this café and ALL its reviews permanently?" : "Delete this content permanently?")) return;
    const table = r.target_type === "review" ? "reviews" : r.target_type === "comment" ? "comments" : "community_cafes";
    const { error } = await supabase!.from(table).delete().eq("id", r.target_id);
    if (error) return setMsg(error.message);
    if (r.target?.photo_path) await supabase!.storage.from(PHOTO_BUCKET).remove([r.target.photo_path]);
    await resolve(r.id);
  }

  let content: React.ReactNode;
  if (!supabase) content = <p>Supabase isn&apos;t configured.</p>;
  else if (loading) content = <p>Loading…</p>;
  else if (!user) content = <p>Sign in first.</p>;
  else if (isAdmin === false) content = <p>You&apos;re not an admin.</p>;
  else if (reports.length === 0) content = <p className="text-stone-500">No open reports. 🎉</p>;
  else
    content = (
      <ul className="space-y-3">
        {reports.map((r) => (
          <li key={r.id} className="rounded-xl border border-stone-200 bg-white p-4 text-sm">
            <p className="text-xs uppercase tracking-wide text-stone-400">
              {r.target_type} · reported {new Date(r.created_at).toLocaleString("en-GB")}
            </p>
            <p className="mt-1">
              <span className="font-medium">Reason:</span> {r.reason}
            </p>
            <blockquote className="mt-2 border-l-2 border-stone-300 pl-3 text-stone-700">
              {r.target ? r.target.body : <em>Already deleted</em>}
            </blockquote>
            {r.target?.cafe_slug && (
              <Link href={cafeHref(r.target.cafe_slug)} className="text-xs text-amber-800 underline">
                View on site
              </Link>
            )}
            <div className="mt-3 flex gap-2">
              {r.target && (
                <button onClick={() => removeContent(r)} className="rounded-lg bg-red-700 px-3 py-1.5 text-white">
                  Delete content
                </button>
              )}
              <button onClick={() => resolve(r.id)} className="rounded-lg border border-stone-300 px-3 py-1.5">
                {r.target ? "Keep & dismiss" : "Dismiss"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    );

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-bold">Moderation queue</h1>
      {msg && <p className="mb-4 text-sm text-red-700">{msg}</p>}
      {content}
    </main>
  );
}
