"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getShopCardBySlug, getShopsInBbox, NEGROS_BBOX, type Bbox, type ShopCard } from "@/lib/db";
import { hasSupabaseEnv } from "@/lib/env";
import type { ExploreFilters } from "@/lib/filters";
import { getPublicRest } from "@/lib/supabase/public-rest";

const GRID = 0.02; // degrees (~2 km): fetch area snaps outward to this grid

/** Grow the viewport by 25% each side and snap to a grid so small pans hit the cache. */
export function fetchBboxFor(view: Bbox): Bbox {
  const padLng = (view.maxLng - view.minLng) * 0.25;
  const padLat = (view.maxLat - view.minLat) * 0.25;
  const down = (v: number) => Math.floor(v / GRID) * GRID;
  const up = (v: number) => Math.ceil(v / GRID) * GRID;
  const r = (v: number) => Number(v.toFixed(2));
  return {
    minLng: r(Math.max(NEGROS_BBOX.minLng - 0.5, down(view.minLng - padLng))),
    minLat: r(Math.max(NEGROS_BBOX.minLat - 0.5, down(view.minLat - padLat))),
    maxLng: r(Math.min(NEGROS_BBOX.maxLng + 0.5, up(view.maxLng + padLng))),
    maxLat: r(Math.min(NEGROS_BBOX.maxLat + 0.5, up(view.maxLat + padLat))),
  };
}

/**
 * Published shops for the map. Searching (q or city) is island-wide; otherwise only the
 * area around the viewport is fetched.
 */
export function useShops(
  view: Bbox | null,
  filters: Pick<ExploreFilters, "q" | "types" | "tiers" | "city">,
) {
  const islandWide = filters.q.trim() !== "" || !!filters.city;
  const padded = view ? fetchBboxFor(view) : null;
  const coversIsland =
    !!padded &&
    padded.minLng <= NEGROS_BBOX.minLng &&
    padded.minLat <= NEGROS_BBOX.minLat &&
    padded.maxLng >= NEGROS_BBOX.maxLng &&
    padded.maxLat >= NEGROS_BBOX.maxLat;
  // Reuse the first (island-wide) result instead of refetching a slightly bigger box.
  const bbox = islandWide || !padded || coversIsland ? NEGROS_BBOX : padded;
  const args = {
    types: filters.types,
    tiers: filters.tiers,
    city: filters.city ?? undefined,
    q: filters.q.trim() || undefined,
  };
  return useQuery({
    queryKey: ["shops", "bbox", bbox, args],
    queryFn: () => getShopsInBbox(getPublicRest(), bbox, args),
    enabled: hasSupabaseEnv(),
    placeholderData: keepPreviousData,
  });
}

/** A selected shop that is not in the current results (e.g. opened from a shared link). */
export function useShopBySlug(slug: string | null, loaded: ShopCard[] | undefined) {
  const inList = slug ? loaded?.find((s) => s.slug === slug) : undefined;
  const query = useQuery({
    queryKey: ["shops", "slug", slug],
    queryFn: () => getShopCardBySlug(getPublicRest(), slug!),
    enabled: hasSupabaseEnv() && !!slug && !inList,
  });
  return inList ?? query.data ?? null;
}
