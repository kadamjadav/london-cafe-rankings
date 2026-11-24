"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useUser } from "@/lib/useSession";

export default function AuthButton() {
  const supabase = getSupabase();
  const { user, loading } = useUser();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [editingName, setEditingName] = useState(false);

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

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 40) {
      setStatus("Name must be 2–40 characters.");
      return;
    }
    const { error } = await supabase!.from("profiles").update({ display_name: trimmed }).eq("id", user!.id);
    setStatus(error ? error.message : "Saved.");
    if (!error) setEditingName(false);
  }

  return (
    <div className="relative">
      <button
        onClick={() => {
          setOpen((o) => !o);
          setStatus(null);
        }}
        className="rounded-full border border-stone-300 bg-white px-4 py-1.5 text-sm font-medium hover:bg-stone-50"
      >
        {user ? name || "Account" : "Sign in"}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-stone-200 bg-white p-4 shadow-lg">
          {!user ? (
            <form onSubmit={sendLink} className="space-y-2">
              <p className="text-sm text-stone-600">Sign in to review, like and comment. No password — we email you a link.</p>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
              <button className="w-full rounded-lg bg-stone-900 px-3 py-2 text-sm font-medium text-white">
                Email me a link
              </button>
            </form>
          ) : editingName ? (
            <form onSubmit={saveName} className="space-y-2">
              <label className="block text-sm text-stone-600">
                Public display name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={40}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
              </label>
              <button className="w-full rounded-lg bg-stone-900 px-3 py-2 text-sm font-medium text-white">Save</button>
            </form>
          ) : (
            <div className="space-y-2 text-sm">
              <p className="truncate text-stone-500">{user.email}</p>
              <button onClick={() => setEditingName(true)} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-stone-100">
                Change display name
              </button>
              <button
                onClick={() => supabase.auth.signOut().then(() => setOpen(false))}
                className="block w-full rounded-lg px-3 py-2 text-left hover:bg-stone-100"
              >
                Sign out
              </button>
            </div>
          )}
          {status && <p className="mt-2 text-xs text-stone-600">{status}</p>}
        </div>
      )}
    </div>
  );
}
