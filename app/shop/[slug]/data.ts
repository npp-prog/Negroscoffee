import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { getShopBySlug, listPublishedSlugs, listsForShop, type ShopDetail } from "@/lib/db";
import { hasSupabaseEnv } from "@/lib/env";
import { getPublicSupabase } from "@/lib/supabase/server";

/** Cache tag for one shop; admin edits call revalidateTag(shopTag(slug)). */
export const shopTag = (slug: string) => `shop:${slug}`;

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PLACEHOLDER = "kape-negros-placeholder";

/** A published shop with photos and menu, as a logged-out visitor sees it. */
export type PublicShop = ShopDetail & { lists: { slug: string; title: string }[] };

export async function getPublicShop(slug: string): Promise<PublicShop | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(shopTag(slug), "shops", "lists");
  if (!hasSupabaseEnv() || !SLUG.test(slug) || slug === PLACEHOLDER) return null;
  const db = getPublicSupabase();
  const shop = await getShopBySlug(db, slug);
  if (!shop) return null;
  const lists = await listsForShop(db, shop.id).catch(() => []);
  return { ...shop, lists };
}

/** Slugs to prerender. Falls back to a placeholder (renders 404) when the DB is unreachable. */
export async function getPrerenderSlugs(): Promise<{ slug: string }[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("shops");
  const placeholder = [{ slug: PLACEHOLDER }];
  if (!hasSupabaseEnv()) return placeholder;
  try {
    const rows = await listPublishedSlugs(getPublicSupabase());
    return rows.length ? rows.map((r) => ({ slug: r.slug })) : placeholder;
  } catch (err) {
    console.warn("[shop] could not list slugs for prerendering:", (err as Error).message);
    return placeholder;
  }
}
