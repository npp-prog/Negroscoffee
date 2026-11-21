import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import type { Database } from "@/lib/db/types";
import { publicEnv } from "@/lib/env";

/**
 * Supabase client for Server Components, Route Handlers and Server Actions, acting as the
 * signed-in user (RLS applies). Reads cookies, so the calling route renders dynamically.
 */
export async function getServerSupabase() {
  const env = publicEnv();
  const cookieStore = await cookies();
  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component: cookies are read-only there. The proxy refreshes sessions.
          }
        },
      },
    },
  );
}

/**
 * Cookie-less anon client for public, cacheable reads (published shops, cities).
 * Same visibility as a logged-out visitor.
 */
export function getPublicSupabase() {
  const env = publicEnv();
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
