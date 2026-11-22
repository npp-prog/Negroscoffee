/**
 * Owner insights data access (migration 20261122000006). Framework-free.
 */
import { parseInsights, type InsightKind, type ShopInsights } from "../insights";
import { unwrap, type Db } from "./client";

/** Count one anonymous event; failures are ignored (stats must never break the page). */
export async function trackShopEvent(db: Db, slug: string, kind: InsightKind): Promise<void> {
  await db.rpc("track_shop_event", { p_slug: slug, p_kind: kind }).then(
    () => undefined,
    () => undefined,
  );
}

/** Summary for one shop (its owner or an admin only). */
export async function getShopInsights(
  db: Db,
  shopId: string,
  days = 30,
): Promise<ShopInsights | null> {
  const { data, error } = await db.rpc("shop_insights", { p_shop_id: shopId, p_days: days });
  if (error) throw new Error(error.message);
  return parseInsights(data);
}

export type TopShop = {
  shopId: string;
  name: string;
  slug: string;
  views: number;
  directions: number;
};

/** Admin: most viewed shops over the last `days` days (Philippine dates, today included). */
export async function listTopShops(db: Db, days = 7, limit = 5): Promise<TopShop[]> {
  const { data, error } = await db.rpc("top_shops", { p_days: days, p_limit: limit });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    shopId: r.shop_id,
    name: r.name,
    slug: r.slug,
    views: Number(r.views),
    directions: Number(r.directions),
  }));
}

export async function getShopRating(
  db: Db,
  shopId: string,
): Promise<{ avg: number | null; count: number }> {
  const row = unwrap<{ rating_avg: number | null; rating_count: number } | null>(
    await db.from("shops").select("rating_avg, rating_count").eq("id", shopId).maybeSingle(),
  );
  return {
    avg: row?.rating_avg == null ? null : Number(row.rating_avg),
    count: row?.rating_count ?? 0,
  };
}
