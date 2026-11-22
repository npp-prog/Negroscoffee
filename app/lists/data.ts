import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import {
  getListBySlug,
  listPublishedListSlugs,
  listPublishedLists,
  type ShopListDetail,
  type ShopListSummary,
} from "@/lib/db";
import { hasSupabaseEnv } from "@/lib/env";
import { listTag } from "@/lib/lists";
import { getPublicSupabase } from "@/lib/supabase/server";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PLACEHOLDER = "kape-negros-placeholder";

export async function getPublicLists(): Promise<ShopListSummary[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("lists", "shops");
  if (!hasSupabaseEnv()) return [];
  try {
    return await listPublishedLists(getPublicSupabase());
  } catch (err) {
    console.warn("[lists] could not load lists:", (err as Error).message);
    return [];
  }
}

export async function getPublicList(slug: string): Promise<ShopListDetail | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(listTag(slug), "lists", "shops");
  if (!hasSupabaseEnv() || !SLUG.test(slug) || slug === PLACEHOLDER) return null;
  const list = await getListBySlug(getPublicSupabase(), slug);
  return list && list.status === "published" ? list : null;
}

export async function getListPrerenderSlugs(): Promise<{ slug: string }[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("lists");
  const placeholder = [{ slug: PLACEHOLDER }];
  if (!hasSupabaseEnv()) return placeholder;
  try {
    const rows = await listPublishedListSlugs(getPublicSupabase());
    return rows.length ? rows.map((r) => ({ slug: r.slug })) : placeholder;
  } catch {
    return placeholder;
  }
}
