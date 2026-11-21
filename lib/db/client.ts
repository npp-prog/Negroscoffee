import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Tables } from "./types";

/** Any Supabase client typed with our schema (browser, server, service-role, or Expo). */
export type Db = SupabaseClient<Database>;

export type ShopRow = Tables<"shops">;
export type CityRow = Tables<"cities">;
export type ShopPhotoRow = Tables<"shop_photos">;
export type MenuItemRow = Tables<"menu_items">;
export type SubmissionRow = Tables<"submissions">;
export type ProfileRow = Tables<"profiles">;

/** Throw on Supabase errors so callers deal with data only. */
export function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}
