"use client";

import { PostgrestClient } from "@supabase/postgrest-js";

import type { Db } from "@/lib/db/client";
import type { Database } from "@/lib/db/types";

let client: Db | undefined;

/**
 * Lightweight anonymous client for public reads on the map page (PostgREST only, ~10 KB instead
 * of the full supabase-js bundle). It has the same `.from()` / `.rpc()` API the data layer uses,
 * so it is typed as `Db`; don't use it for auth or storage.
 */
export function getPublicRest(): Db {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
    client = new PostgrestClient<Database>(`${url}/rest/v1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    }) as unknown as Db;
  }
  return client;
}
