"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

/**
 * Returns the browser Supabase client, or null when the project hasn't been configured yet.
 * The rankings and map work without Supabase; only the community features need it.
 */
export function getSupabase(): SupabaseClient | null {
  if (!url || !key) return null;
  if (!client) {
    client = createClient(url, key, {
      auth: { persistSession: true, detectSessionInUrl: true, flowType: "pkce" },
    });
  }
  return client;
}

export const PHOTO_BUCKET = "review-photos";

export function photoUrl(path: string): string {
  return getSupabase()!.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
}
