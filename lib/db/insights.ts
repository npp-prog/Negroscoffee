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
  const fromDay = new Date(Date.now() - (days - 1) * 86_400_000).toLocaleDateString("en-CA", {
    timeZone: "Asia/Manila",
  });
  const rows = unwrap<
    {
      shop_id: string;
      views: number;
      map_opens: number;
      directions: number;
      shops: { name: string; slug: string } | null;
    }[]
  >(
    await db
      .from("shop_daily_stats")
      .select("shop_id, views, map_opens, directions, shops(name, slug)")
      .gte("day", fromDay),
  );
  const by = new Map<string, TopShop>();
  for (const r of rows) {
    const t = by.get(r.shop_id) ?? {
      shopId: r.shop_id,
      name: r.shops?.name ?? "Unknown",
      slug: r.shops?.slug ?? "",
      views: 0,
      directions: 0,
    };
    t.views += r.views + r.map_opens;
    t.directions += r.directions;
    by.set(r.shop_id, t);
  }
  return [...by.values()]
    .sort((a, b) => b.views - a.views || b.directions - a.directions)
    .slice(0, limit);
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
