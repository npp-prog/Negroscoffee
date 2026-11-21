import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import type { CityOption } from "@/components/forms/suggest-form";
import { listCities } from "@/lib/db";
import { hasSupabaseEnv } from "@/lib/env";
import { getPublicSupabase } from "@/lib/supabase/server";

export async function getCityOptions(): Promise<CityOption[]> {
  "use cache";
  cacheLife("days");
  cacheTag("cities");
  if (!hasSupabaseEnv()) return [];
  try {
    const cities = await listCities(getPublicSupabase());
    return cities.map((c) => ({ slug: c.slug, name: c.name, province: c.province }));
  } catch (err) {
    console.warn("[suggest] could not load cities:", (err as Error).message);
    return [];
  }
}
