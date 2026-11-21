import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/db/types";
import { publicEnv } from "@/lib/env";

/**
 * Service-role client: BYPASSES row-level security. Server-only; use for trusted jobs
 * (approving submissions, imports). Always check the caller is an admin first.
 */
export function getAdminSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.");
  return createClient<Database>(publicEnv().NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
