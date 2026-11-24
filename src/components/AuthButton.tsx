"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { profileHref } from "./Avatar";
import { getSupabase } from "@/lib/supabase";
import { useUser } from "@/lib/useSession";

export default function AuthButton() {
  const supabase = getSupabase();
  const { user, loading } = useUser();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [name, setName] = useState("");

  useEffect(() => {
    if (!supabase || !user) return;
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single()
      .then(({ data }) => data && setName(data.display_name));
  }, [supabase, user]);

  if (!supabase || loading) return null;

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus("Sending…");
    const { error } = await supabase!.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.href },
    });
    setStatus(error ? error.message : "Check your inbox for a sign-in link.");
  }

  return (
    <div className="relative">
      <button
        onClick={() => {
          setOpen((o) => !o);
          setStatus(null);
        }}
        className="rounded-[3px] border border-chalk/40 px-3.5 py-1.5 text-sm font-medium text-chalk hover:border-chalk"
      >
        {user ? name || "Account" : "Sign in"}
      </button>

      {open && (
        <div className="absolute right-0 z-[1000] mt-2 w-72 rounded-md border border-rule bg-porcelain p-4 text-ink shadow-lg">
          {!user ? (
            <form onSubmit={sendLink} className="space-y-2">
              <p className="text-sm text-ink-soft">Sign in to review, like and comment. No password — we email you a link.</p>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded border border-rule px-3 py-2 text-sm"
              />
              <button className="btn-primary w-full justify-center">
                Email me a link
              </button>
            </form>
          ) : (
            <div className="space-y-2 text-sm">
              <p className="truncate text-ink-soft">{user.email}</p>
              <Link
                href={profileHref(user.id)}
                onClick={() => setOpen(false)}
                className="block w-full rounded px-3 py-2 text-left hover:bg-chalk-deep"
              >
                My profile
              </Link>
              <button
                onClick={() => supabase.auth.signOut().then(() => setOpen(false))}
                className="block w-full rounded px-3 py-2 text-left hover:bg-chalk-deep"
              >
                Sign out
              </button>
            </div>
          )}
          {status && <p className="mt-2 text-xs text-ink-soft">{status}</p>}
        </div>
      )}
    </div>
  );
}
