"use client";

import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/lib/db/types";
import { publicEnv } from "@/lib/env";

let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

/** Singleton Supabase client for Client Components (anon key, user session from cookies). */
export function getBrowserSupabase() {
  if (!client) {
    const env = publicEnv();
    client = createBrowserClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );
  }
  return client;
}
