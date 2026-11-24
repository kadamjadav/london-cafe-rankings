"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabase, photoUrl, PHOTO_BUCKET } from "@/lib/supabase";
import { useUser } from "@/lib/useSession";
import { ImageError, sanitiseImage } from "@/lib/image";
import Link from "next/link";
import Avatar, { profileHref } from "./Avatar";

type Profile = { display_name: string } | null;

type Comment = {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  profiles: Profile;
};

type Review = {
  id: string;
  user_id: string;
  rating: number;
  body: string;
  photo_path: string | null;
  created_at: string;
  profiles: Profile;
  review_likes: { user_id: string }[];
  comments: Comment[];
};

// Foreign keys are named explicitly: reviews and profiles are ALSO linked through review_likes,
// so a bare `profiles(...)` embed is ambiguous to the API.
const REVIEW_SELECT =
  "id, user_id, rating, body, photo_path, created_at, profiles!reviews_user_id_fkey(display_name), review_likes(user_id), comments(id, body, created_at, user_id, profiles!comments_user_id_fkey(display_name))";

export function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function Stars({ value }: { value: number }) {
  return (
    <span className="text-brass" aria-label={`${value} out of 5`}>
      {"★".repeat(value)}
      <span className="text-ink-soft">{"★".repeat(5 - value)}</span>
    </span>
  );
}

function PersonLink({ id, profile, size = 28 }: { id: string; profile: Profile; size?: number }) {
  const name = profile?.display_name ?? "Someone";
  return (
    <Link href={profileHref(id)} className="inline-flex items-center gap-2 font-medium hover:underline">
      <Avatar name={name} id={id} size={size} />
      {name}
    </Link>
  );
}

const COMMENTS_PREVIEW = 2;

export default function Community({ cafeSlug }: { cafeSlug: string }) {
  const supabase = getSupabase();
  const { user } = useUser();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Remember WHICH user we confirmed as admin, so signing out can't leave stale admin buttons.
  const [adminUserId, setAdminUserId] = useState<string | null>(null);
  const isAdmin = !!user && adminUserId === user.id;

  const fetchReviews = useCallback(() => {
    return supabase!
      .from("reviews")
      .select(REVIEW_SELECT)
      .eq("cafe_slug", cafeSlug)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) setError("Reviews couldn't load. Check your connection and refresh the page.");
        else setReviews((data as unknown as Review[]) ?? []);
        setLoading(false);
      });
  }, [supabase, cafeSlug]);

  useEffect(() => {
    if (supabase) fetchReviews();
  }, [supabase, fetchReviews]);

  useEffect(() => {
    if (!supabase || !user) return;
    supabase.rpc("is_admin").then(({ data }) => setAdminUserId(data ? user.id : null));
  }, [supabase, user]);

  const load = () => void fetchReviews();

  if (!supabase) {
    return (
      <section className="rounded-md border border-dashed border-rule p-6 text-sm text-ink-soft">
        Community reviews aren&apos;t switched on yet. (Site owner: add your Supabase keys — see the README.)
      </section>
    );
  }

  const myReview = user ? reviews.find((r) => r.user_id === user.id) : undefined;
  const avg = reviews.length ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : null;

  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-display text-2xl">Reviews</h2>
        {avg !== null && (
          <p className="text-sm text-ink-soft">
            <Stars value={Math.round(avg)} /> {avg.toFixed(1)} from {reviews.length}{" "}
            {reviews.length === 1 ? "review" : "reviews"}
          </p>
        )}
      </div>

      {!user ? (
        <p className="mb-6 rounded-md bg-porcelain p-4 text-sm text-ink">
          Been here? Sign in (top right) to add your own review and photos.
        </p>
      ) : myReview ? (
        <p className="mb-6 text-sm text-ink-soft">You&apos;ve reviewed this café. Delete your review below to write a new one.</p>
      ) : (
        <ReviewForm cafeSlug={cafeSlug} userId={user.id} onPosted={load} />
      )}

      {error && <p className="mb-4 text-sm text-red-800">{error}</p>}
      {loading ? (
        <p className="text-sm text-ink-soft">Loading reviews…</p>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-ink-soft">No community reviews yet — be the first.</p>
      ) : (
        <ul className="space-y-4">
          {reviews.map((r) => (
            <ReviewCard key={r.id} review={r} userId={user?.id} isAdmin={isAdmin} onChange={load} />
          ))}
        </ul>
      )}
    </section>
  );
}

function ReviewForm({ cafeSlug, userId, onPosted }: { cafeSlug: string; userId: string; onPosted: () => void }) {
  const supabase = getSupabase()!;
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1) return setMsg("Pick a star rating.");
    if (body.trim().length < 10) return setMsg("Write at least a sentence (10+ characters).");
    setBusy(true);
    setMsg(null);

    let photoPath: string | null = null;
    try {
      if (file) {
        const clean = await sanitiseImage(file); // strips GPS/EXIF metadata + resizes
        photoPath = `${userId}/${crypto.randomUUID()}.jpg`;
        const { error } = await supabase.storage
          .from(PHOTO_BUCKET)
          .upload(photoPath, clean, { contentType: "image/jpeg", upsert: false });
        if (error) throw error;
      }
      const { error } = await supabase
        .from("reviews")
        .insert({ cafe_slug: cafeSlug, user_id: userId, rating, body: body.trim(), photo_path: photoPath });
      if (error) {
        if (photoPath) await supabase.storage.from(PHOTO_BUCKET).remove([photoPath]); // don't orphan the upload
        throw error;
      }
      setRating(0);
      setBody("");
      setFile(null);
      onPosted();
    } catch (err) {
      setMsg(err instanceof ImageError || err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mb-8 space-y-3 rounded-md border border-rule bg-porcelain p-4">
      <div className="flex items-center gap-1" role="radiogroup" aria-label="Your rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            type="button"
            key={n}
            onClick={() => setRating(n)}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            aria-checked={rating === n}
            role="radio"
            className={`text-2xl ${n <= rating ? "text-brass" : "text-ink-soft"}`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={2000}
        rows={4}
        placeholder="What did you order? How was it?"
        className="w-full rounded border border-rule px-3 py-2 text-sm"
      />
      <div className="flex flex-wrap items-center gap-3">
        <label className="cursor-pointer rounded border border-rule px-3 py-2 text-sm hover:bg-chalk">
          {file ? "Change photo" : "Add a photo"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Selected photo preview" className="h-14 w-14 rounded object-cover" />
        )}
        {file && (
          <button type="button" onClick={() => setFile(null)} className="text-xs text-ink-soft underline">
            remove
          </button>
        )}
        <span className="text-xs text-ink-soft">Location data is removed from photos before upload.</span>
      </div>
      <div className="flex items-center gap-3">
        <button disabled={busy} className="btn-primary">
          {busy ? "Posting…" : "Post review"}
        </button>
        {msg && <p className="text-sm text-red-800">{msg}</p>}
      </div>
    </form>
  );
}

function ReviewCard({
  review,
  userId,
  isAdmin,
  onChange,
}: {
  review: Review;
  userId?: string;
  isAdmin: boolean;
  onChange: () => void;
}) {
  const supabase = getSupabase()!;
  const [showAllComments, setShowAllComments] = useState(false);
  const [comment, setComment] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const liked = !!userId && review.review_likes.some((l) => l.user_id === userId);
  const isOwner = userId === review.user_id;
  const comments = [...review.comments].sort((a, b) => a.created_at.localeCompare(b.created_at));

  async function toggleLike() {
    if (!userId) return setMsg("Sign in to like reviews.");
    const { error } = liked
      ? await supabase.from("review_likes").delete().eq("review_id", review.id).eq("user_id", userId)
      : await supabase.from("review_likes").insert({ review_id: review.id, user_id: userId });
    if (error) setMsg(error.message);
    onChange();
  }

  async function deleteReview() {
    if (!confirm("Delete this review? This can't be undone.")) return;
    const { error } = await supabase.from("reviews").delete().eq("id", review.id);
    if (error) return setMsg(error.message);
    if (review.photo_path) await supabase.storage.from(PHOTO_BUCKET).remove([review.photo_path]);
    onChange();
  }

  async function addComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    const { error } = await supabase
      .from("comments")
      .insert({ review_id: review.id, user_id: userId, body: comment.trim() });
    if (error) return setMsg(error.message);
    setComment("");
    onChange();
  }

  async function deleteComment(id: string) {
    if (!confirm("Delete this comment?")) return;
    const { error } = await supabase.from("comments").delete().eq("id", id);
    if (error) setMsg(error.message);
    onChange();
  }

  return (
    <li className="rounded-md border border-rule bg-porcelain p-4">
      <div className="flex items-baseline justify-between gap-3">
        <PersonLink id={review.user_id} profile={review.profiles} />
        <p className="text-xs text-ink-soft">{timeAgo(review.created_at)}</p>
      </div>
      <div className="mt-1">
        <Stars value={review.rating} />
      </div>
      <p className="mt-2 whitespace-pre-line text-sm text-ink">{review.body}</p>
      {review.photo_path && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl(review.photo_path)}
          alt={`Photo from ${review.profiles?.display_name ?? "a visitor"}'s review`}
          loading="lazy"
          className="mt-3 max-h-80 rounded-md object-cover"
        />
      )}

      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
        <button onClick={toggleLike} className={liked ? "font-medium text-pop" : "text-ink-soft hover:text-ink"}>
          {liked ? "♥" : "♡"} {review.review_likes.length}
        </button>
        <span className="text-ink-soft">💬 {review.comments.length}</span>
        {userId && !isOwner && <ReportButton type="review" id={review.id} />}
        {(isOwner || isAdmin) && (
          <button onClick={deleteReview} className="text-red-800 hover:underline">
            Delete{!isOwner && " (admin)"}
          </button>
        )}
      </div>
      {msg && <p className="mt-2 text-xs text-red-800">{msg}</p>}

      {/* Comments are always visible (latest few) so visitors can see the conversation without hunting for it. */}
      <div className="mt-3 space-y-2 border-t border-rule pt-3">
        {comments.length > COMMENTS_PREVIEW && !showAllComments && (
          <button onClick={() => setShowAllComments(true)} className="text-xs font-medium text-ink-soft hover:text-ink">
            View all {comments.length} comments
          </button>
        )}
        {(showAllComments ? comments : comments.slice(-COMMENTS_PREVIEW)).map((c) => (
          <div key={c.id} className="flex items-start gap-2 text-sm">
            <Link href={profileHref(c.user_id)} className="mt-0.5">
              <Avatar name={c.profiles?.display_name ?? "?"} id={c.user_id} size={22} />
            </Link>
            <div className="min-w-0 flex-1">
              <Link href={profileHref(c.user_id)} className="font-medium hover:underline">
                {c.profiles?.display_name ?? "Someone"}
              </Link>{" "}
              <span className="whitespace-pre-line text-ink">{c.body}</span>
              <div className="mt-0.5 flex items-center gap-3 text-xs text-ink-soft">
                {timeAgo(c.created_at)}
                {(c.user_id === userId || isAdmin) && (
                  <button onClick={() => deleteComment(c.id)} className="text-red-800 hover:underline">
                    delete
                  </button>
                )}
                {userId && c.user_id !== userId && <ReportButton type="comment" id={c.id} small />}
              </div>
            </div>
          </div>
        ))}
        {userId ? (
          <form onSubmit={addComment} className="flex gap-2">
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={1000}
              placeholder={comments.length ? "Reply to this review…" : "Be the first to comment…"}
              className="min-w-0 flex-1 rounded border border-rule px-3 py-1.5 text-sm"
            />
            <button className="btn-primary py-1.5">Post</button>
          </form>
        ) : (
          <p className="text-xs text-ink-soft">Sign in to join the conversation.</p>
        )}
      </div>
    </li>
  );
}

export function ReportButton({ type, id, small }: { type: "review" | "comment" | "cafe"; id: string; small?: boolean }) {
  const supabase = getSupabase()!;
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [done, setDone] = useState<string | null>(null);

  if (done) return <span className="text-xs text-ink-soft">{done}</span>;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("reports").insert({ target_type: type, target_id: id, reason: reason.trim() });
    setDone(error ? (error.code === "23505" ? "Already reported" : error.message) : "Reported — thanks");
  }

  if (!open)
    return (
      <button onClick={() => setOpen(true)} className={`${small ? "text-xs" : ""} text-ink-soft hover:text-ink`}>
        Report
      </button>
    );

  return (
    <form onSubmit={submit} className="mt-2 flex w-full gap-2">
      <input
        autoFocus
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        minLength={3}
        maxLength={500}
        required
        placeholder="What's wrong with it?"
        className="min-w-0 flex-1 rounded border border-rule px-2 py-1 text-xs"
      />
      <button className="rounded bg-chalk-deep px-2 py-1 text-xs">Send</button>
    </form>
  );
}
