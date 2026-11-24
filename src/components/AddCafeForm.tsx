"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import LocationPickerClient from "./LocationPickerClient";
import { cafeHref, fetchCommunityCafes, mergeCafes, slugify, type AnyCafe } from "@/lib/communityCafes";
import { getSupabase } from "@/lib/supabase";
import { useUser } from "@/lib/useSession";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export default function AddCafeForm() {
  const supabase = getSupabase();
  const router = useRouter();
  const { user, loading } = useUser();
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [address, setAddress] = useState("");
  const [spot, setSpot] = useState<{ lat: number; lng: number } | null>(null);
  const [existing, setExisting] = useState<AnyCafe[]>(() => mergeCafes([]));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (supabase) fetchCommunityCafes().then((c) => setExisting(mergeCafes(c)));
  }, [supabase]);

  // Warn before someone adds a café that's already on the site.
  const similar = useMemo(() => {
    const n = norm(name);
    if (n.length < 3) return [];
    return existing.filter((c) => norm(c.name).includes(n) || n.includes(norm(c.name))).slice(0, 3);
  }, [name, existing]);

  if (!supabase) return <p className="text-sm text-stone-500">Community features aren&apos;t switched on yet.</p>;
  if (loading) return <p className="text-sm text-stone-500">Loading…</p>;
  if (!user)
    return (
      <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
        Sign in (top right) to add a café. It&apos;s free and only needs your email.
      </p>
    );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return setMsg("Give the café a name.");
    if (area.trim().length < 2) return setMsg("Add the area, e.g. Shoreditch or Brixton.");
    if (!spot) return setMsg("Tap the map to drop a pin on where the café is.");
    setBusy(true);
    setMsg(null);
    const base = slugify(name.trim(), area.trim());
    // Two different cafés can share a name+area slug only if one was renamed; add a short suffix on clash.
    for (const slug of [base, `${base.slice(0, 72)}-${Math.random().toString(36).slice(2, 6)}`]) {
      const { error } = await supabase!.from("community_cafes").insert({
        slug,
        name: name.trim(),
        area: area.trim(),
        address: address.trim() || null,
        lat: spot.lat,
        lng: spot.lng,
      });
      if (!error) {
        router.push(cafeHref(slug));
        return;
      }
      if (error.message.includes("community_cafes_name_area_idx")) {
        setMsg("That café is already on the site in that area — search for it on the All cafés page.");
        break;
      }
      if (error.message.includes("row-level security")) {
        setMsg("You've added 5 cafés in the last 24 hours, which is the daily limit. Try again tomorrow.");
        break;
      }
      if (!error.message.includes("community_cafes_pkey")) {
        setMsg(error.message);
        break;
      }
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <label className="block text-sm font-medium">
        Café name
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          placeholder="e.g. Prufrock Coffee"
          className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-normal"
        />
      </label>
      {similar.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Already on the site? {""}
          {similar.map((c, i) => (
            <span key={c.slug}>
              {i > 0 && ", "}
              <Link href={c.href} className="font-medium underline">
                {c.name} ({c.area})
              </Link>
            </span>
          ))}
        </div>
      )}
      <label className="block text-sm font-medium">
        Area
        <input
          value={area}
          onChange={(e) => setArea(e.target.value)}
          maxLength={40}
          placeholder="e.g. Farringdon"
          className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-normal"
        />
      </label>
      <label className="block text-sm font-medium">
        Address <span className="font-normal text-stone-400">(optional)</span>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          maxLength={160}
          placeholder="e.g. 23–25 Leather Lane, London EC1N 7TE"
          className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-normal"
        />
      </label>
      <div>
        <p className="text-sm font-medium">Where is it?</p>
        <p className="mb-2 text-xs text-stone-500">
          Zoom in and tap the map to drop a pin. Drag it to fine-tune.
          {spot && <span className="ml-1 font-medium text-amber-800">Pin placed ✓</span>}
        </p>
        <LocationPickerClient value={spot} onChange={setSpot} />
      </div>
      <div className="flex items-center gap-4">
        <button
          disabled={busy}
          className="rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? "Adding…" : "Add café"}
        </button>
        {msg && <p className="text-sm text-red-700">{msg}</p>}
      </div>
      <p className="text-xs text-stone-400">
        Only add real, public cafés in London. Fake or spam entries are removed. Max 5 a day.
      </p>
    </form>
  );
}
