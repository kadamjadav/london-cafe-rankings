"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Avatar from "./Avatar";
import { Stars, timeAgo } from "./Community";
import { getCafe } from "@/lib/cafes";
import { cafeHref, isCommunitySlug } from "@/lib/communityCafes";
import { getSupabase, photoUrl } from "@/lib/supabase";
import { useUser } from "@/lib/useSession";

type Profile = { id: string; display_name: string; bio: string | null; created_at: string };
type ProfileReview = {
  id: string;
  cafe_slug: string;
  rating: number;
  body: string;
  photo_path: string | null;
  created_at: string;
  review_likes: { user_id: string }[];
  comments: { id: string }[];
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function ProfileView() {
  const supabase = getSupabase();
  const id = useSearchParams().get("id") ?? "";
  const { user } = useUser();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [reviews, setReviews] = useState<ProfileReview[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "missing">(() =>
    supabase && UUID.test(id) ? "loading" : "missing",
  );
  const [editing, setEditing] = useState(false);
  const [communityNames, setCommunityNames] = useState<Map<string, { name: string; area: string }>>(new Map());

  const load = useCallback(() => {
    if (!supabase || !UUID.test(id)) return;
    Promise.all([
      supabase.from("profiles").select("id, display_name, bio, created_at").eq("id", id).maybeSingle(),
      supabase
        .from("reviews")
        .select("id, cafe_slug, rating, body, photo_path, created_at, review_likes(user_id), comments(id)")
        .eq("user_id", id)
        .order("created_at", { ascending: false }),
    ]).then(([p, r]) => {
      if (!p.data) return setState("missing");
      const list = (r.data as ProfileReview[]) ?? [];
      setProfile(p.data as Profile);
      setReviews(list);
      setState("ready");
      const slugs = [...new Set(list.map((x) => x.cafe_slug).filter(isCommunitySlug))];
      if (slugs.length)
        supabase
          .from("community_cafes")
          .select("slug, name, area")
          .in("slug", slugs)
          .then(({ data }) =>
            setCommunityNames(new Map((data ?? []).map((c) => [c.slug as string, { name: c.name as string, area: c.area as string }]))),
          );
    });
  }, [supabase, id]);

  useEffect(() => {
    load();
  }, [load]);

  if (state === "missing")
    return (
      <div className="text-center">
        <h1 className="font-display text-3xl">Profile not found</h1>
        <Link href="/" className="mt-4 inline-block text-awning underline">
          Back to the rankings
        </Link>
      </div>
    );
  if (state === "loading" || !profile) return <p className="text-sm text-ink-soft">Loading profile…</p>;

  const isMe = user?.id === profile.id;
  const likesReceived = reviews.reduce((n, r) => n + r.review_likes.length, 0);
  const joined = new Date(profile.created_at).toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  return (
    <>
      <header className="flex flex-wrap items-start gap-5">
        <Avatar name={profile.display_name} id={profile.id} size={80} />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-4xl leading-tight sm:text-5xl">{profile.display_name}</h1>
          <p className="text-sm text-ink-soft">Joined {joined}</p>
          {profile.bio && <p className="mt-3 whitespace-pre-line text-ink">{profile.bio}</p>}
          <dl className="mt-4 flex gap-6 text-sm">
            <div>
              <dt className="text-ink-soft">Reviews</dt>
              <dd className="figures text-3xl ">{reviews.length}</dd>
            </div>
            <div>
              <dt className="text-ink-soft">Likes received</dt>
              <dd className="figures text-3xl ">{likesReceived}</dd>
            </div>
          </dl>
        </div>
        {isMe && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="btn-quiet"
          >
            Edit profile
          </button>
        )}
      </header>

      {isMe && editing && (
        <EditProfile
          profile={profile}
          onDone={() => {
            setEditing(false);
            load();
          }}
        />
      )}

      <h2 className="mb-4 mt-12 font-display text-2xl">{isMe ? "Your reviews" : "Reviews"}</h2>
      {reviews.length === 0 ? (
        <p className="rounded-md border border-dashed border-rule p-6 text-center text-sm text-ink-soft">
          {isMe ? "You haven't reviewed a café yet. Pick one from the rankings." : "No reviews yet."}
        </p>
      ) : (
        <ul className="space-y-4">
          {reviews.map((r) => {
            const cafe = getCafe(r.cafe_slug) ?? communityNames.get(r.cafe_slug);
            return (
              <li key={r.id} className="rounded-md border border-rule bg-porcelain p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <Link href={cafeHref(r.cafe_slug)} className="font-semibold hover:underline">
                    {cafe?.name ?? r.cafe_slug}
                  </Link>
                  <span className="text-xs text-ink-soft">{timeAgo(r.created_at)}</span>
                </div>
                {cafe && <p className="text-xs text-ink-soft">{cafe.area}</p>}
                <div className="mt-1">
                  <Stars value={r.rating} />
                </div>
                <p className="mt-2 whitespace-pre-line text-sm text-ink">{r.body}</p>
                {r.photo_path && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoUrl(r.photo_path)}
                    alt={`Photo from ${profile.display_name}'s review of ${cafe?.name ?? "a café"}`}
                    loading="lazy"
                    className="mt-3 max-h-64 rounded-md object-cover"
                  />
                )}
                <p className="mt-3 text-sm text-ink-soft">
                  ♡ {r.review_likes.length} · 💬 {r.comments.length} ·{" "}
                  <Link href={cafeHref(r.cafe_slug)} className="underline">
                    see conversation
                  </Link>
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function EditProfile({ profile, onDone }: { profile: Profile; onDone: () => void }) {
  const supabase = getSupabase()!;
  const [name, setName] = useState(profile.display_name);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [msg, setMsg] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (n.length < 2 || n.length > 40) return setMsg("Name must be 2–40 characters.");
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: n, bio: bio.trim() || null })
      .eq("id", profile.id);
    if (error) return setMsg(error.message);
    onDone();
  }

  return (
    <form onSubmit={save} className="mt-6 space-y-3 rounded-md border border-rule bg-porcelain p-4">
      <label className="block text-sm font-medium">
        Display name
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          className="mt-1 w-full rounded border border-rule px-3 py-2 font-normal"
        />
      </label>
      <label className="block text-sm font-medium">
        Bio <span className="font-normal text-ink-soft">({280 - bio.length} left)</span>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={280}
          rows={3}
          placeholder="Flat white loyalist. Will cross London for a good croissant."
          className="mt-1 w-full rounded border border-rule px-3 py-2 font-normal"
        />
      </label>
      <p className="text-xs text-ink-soft">Shown publicly. Don&apos;t include your address, phone number or email.</p>
      <div className="flex items-center gap-3">
        <button className="btn-primary">Save</button>
        <button type="button" onClick={onDone} className="text-sm text-ink-soft underline">
          Cancel
        </button>
        {msg && <p className="text-sm text-red-800">{msg}</p>}
      </div>
    </form>
  );
}
