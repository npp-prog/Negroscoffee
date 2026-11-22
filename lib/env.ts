/**
 * Public env vars (inlined into the client bundle at build time — must be referenced
 * as literal `process.env.NEXT_PUBLIC_*` expressions). Plain checks, no zod, so the map page
 * doesn't ship a validation library.
 */
export function publicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (!/^https?:\/\/\S+$/.test(url) || !key) {
    throw new Error(
      "Missing Supabase env vars. Copy .env.example to .env.local and set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  return { NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_ANON_KEY: key };
}

/** True when the public Supabase env vars are present (lets the UI degrade gracefully). */
export function hasSupabaseEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/** Supabase project URL for building public asset URLs (empty when not configured). */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

/** Optional public contact address shown on the Privacy page (e.g. a Gmail address). */
export const CONTACT_EMAIL = (process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "").trim();
