"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Avatar, { profileHref } from "./Avatar";
import Community, { ReportButton } from "./Community";
import MapClient from "./MapClient";
import { formatDate } from "@/lib/cafes";
import { COMMUNITY_SELECT, type CommunityCafe } from "@/lib/communityCafes";
import { getSupabase } from "@/lib/supabase";
import { useUser } from "@/lib/useSession";

export default function PlaceView() {
  const supabase = getSupabase();
  const router = useRouter();
  const slug = useSearchParams().get("slug") ?? "";
  const { user } = useUser();
  const [cafe, setCafe] = useState<CommunityCafe | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">(() =>
    supabase && /^c-[a-z0-9-]+$/.test(slug) ? "loading" : "missing",
  );
  const [adminFor, setAdminFor] = useState<string | null>(null);
  const isAdmin = !!user && adminFor === user.id;

  useEffect(() => {
    if (!supabase || !/^c-[a-z0-9-]+$/.test(slug)) return;
    supabase
      .from("community_cafes")
      .select(COMMUNITY_SELECT)
      .eq("slug", slug)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return setState("missing");
        setCafe(data as unknown as CommunityCafe);
        setState("ready");
      });
  }, [supabase, slug]);

  useEffect(() => {
    if (!supabase || !user) return;
    supabase.rpc("is_admin").then(({ data }) => setAdminFor(data ? user.id : null));
  }, [supabase, user]);

  if (state === "missing")
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold">Café not found</h1>
        <p className="mt-2 text-stone-500">It may have been removed.</p>
        <Link href="/cafes" className="mt-4 inline-block text-amber-800 underline">
          See all cafés
        </Link>
      </div>
    );
  if (state === "loading" || !cafe) return <p className="text-sm text-stone-500">Loading café…</p>;

  async function deleteCafe() {
    if (!confirm(`Delete ${cafe!.name} and ALL its reviews? This can't be undone.`)) return;
    const { error } = await supabase!.from("community_cafes").delete().eq("slug", cafe!.slug);
    if (error) return alert(error.message);
    router.push("/cafes");
  }

  const addedByName = cafe.profiles?.display_name ?? "someone";

  return (
    <>
      <Link href="/cafes" className="text-sm text-stone-500 hover:underline">
        ← All cafés
      </Link>

      <header className="mt-4">
        <p className="text-sm font-medium uppercase tracking-wide text-amber-800">Community café</p>
        <h1 className="text-4xl font-bold tracking-tight">{cafe.name}</h1>
        <p className="mt-1 text-stone-500">{cafe.address ?? cafe.area}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-stone-500">
          Added by
          <Link href={profileHref(cafe.added_by)} className="inline-flex items-center gap-1.5 font-medium text-stone-800 hover:underline">
            <Avatar name={addedByName} id={cafe.added_by} size={20} />
            {addedByName}
          </Link>
          on {formatDate(cafe.created_at.slice(0, 10))}
          {user && user.id !== cafe.added_by && <ReportButton type="cafe" id={cafe.id} small />}
          {isAdmin && (
            <button onClick={deleteCafe} className="text-xs text-red-700 hover:underline">
              Delete café (admin)
            </button>
          )}
        </div>
      </header>

      <div className="mt-6">
        <MapClient
          cafes={[{ slug: cafe.slug, name: cafe.name, area: cafe.area, lat: cafe.lat, lng: cafe.lng, href: `/place?slug=${cafe.slug}` }]}
          selected={cafe.slug}
          height={280}
          zoom={15}
          center={[cafe.lat, cafe.lng]}
        />
      </div>

      <div className="mt-12">
        <Community cafeSlug={cafe.slug} />
      </div>
    </>
  );
}
