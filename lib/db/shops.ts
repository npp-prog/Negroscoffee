import type { PriceTier, Province, ShopType } from "../categories";
import { unwrap, type Db, type MenuItemRow, type ShopPhotoRow, type ShopRow } from "./client";
import { parseHours, type WeeklyHours } from "./hours";

/** Flat shop shape used by the map pins and result cards. */
export type ShopCard = {
  id: string;
  slug: string;
  name: string;
  type: ShopType;
  priceTier: PriceTier;
  lattePrice: number | null;
  address: string | null;
  citySlug: string | null;
  cityName: string | null;
  province: Province | null;
  lat: number;
  lng: number;
  hours: WeeklyHours | null;
  coverPath: string | null;
  verifiedAt: string | null;
  /** Only set by distance queries. */
  distanceM?: number;
};

export type ShopFilters = {
  types?: ShopType[];
  tiers?: PriceTier[];
  city?: string;
  q?: string;
};

export type Bbox = { minLng: number; minLat: number; maxLng: number; maxLat: number };

/** Whole of Negros Island, for the initial map view. */
export const NEGROS_BBOX: Bbox = { minLng: 122.35, minLat: 9.0, maxLng: 123.6, maxLat: 11.05 };

type CardSource = {
  id: string | null;
  slug: string | null;
  name: string | null;
  type: string | null;
  price_tier: number | null;
  latte_price: number | null;
  address: string | null;
  city_slug: string | null;
  city_name: string | null;
  province: string | null;
  lat: number | null;
  lng: number | null;
  hours: unknown;
  cover_path: string | null;
  verified_at: string | null;
  distance_m?: number | null;
};

function toCard(r: CardSource): ShopCard | null {
  // Published shops are always categorized and located (DB constraint); skip anything else.
  if (!r.id || !r.slug || !r.name || !r.type || !r.price_tier || r.lat == null || r.lng == null)
    return null;
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    type: r.type as ShopType,
    priceTier: r.price_tier as PriceTier,
    lattePrice: r.latte_price,
    address: r.address,
    citySlug: r.city_slug,
    cityName: r.city_name,
    province: r.province as Province | null,
    lat: r.lat,
    lng: r.lng,
    hours: parseHours(r.hours),
    coverPath: r.cover_path,
    verifiedAt: r.verified_at,
    ...(r.distance_m != null ? { distanceM: r.distance_m } : {}),
  };
}

const cards = (rows: CardSource[]) => rows.map(toCard).filter((c): c is ShopCard => c !== null);

function filterArgs(f: ShopFilters) {
  return {
    ...(f.types?.length ? { types: f.types } : {}),
    ...(f.tiers?.length ? { tiers: f.tiers } : {}),
    ...(f.city ? { city: f.city } : {}),
    ...(f.q?.trim() ? { q: f.q.trim() } : {}),
  };
}

/** Published shops inside a map viewport. */
export async function getShopsInBbox(db: Db, bbox: Bbox, filters: ShopFilters = {}) {
  const rows = unwrap(
    await db.rpc("shops_in_bbox", {
      min_lng: bbox.minLng,
      min_lat: bbox.minLat,
      max_lng: bbox.maxLng,
      max_lat: bbox.maxLat,
      ...filterArgs(filters),
    }),
  );
  return cards(rows);
}

/** Published shops within radiusM of a point, nearest first. */
export async function getShopsNear(
  db: Db,
  point: { lat: number; lng: number },
  radiusM = 5000,
  filters: ShopFilters = {},
) {
  const rows = unwrap(
    await db.rpc("shops_near", {
      lat: point.lat,
      lng: point.lng,
      radius_m: radiusM,
      ...filterArgs(filters),
    }),
  );
  return cards(rows);
}

/** One published shop in card shape (deep-linked selection); null when missing or hidden. */
export async function getShopCardBySlug(db: Db, slug: string): Promise<ShopCard | null> {
  const row = unwrap(
    await db
      .from("shop_cards")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle(),
  );
  return row ? toCard(row) : null;
}

export type ShopDetail = ShopCard & {
  description: string | null;
  phone: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  website: string | null;
  source: ShopRow["source"];
  /** OpenStreetMap id ("node/123") for imported shops. */
  osmId: string | null;
  photos: Pick<ShopPhotoRow, "id" | "storage_path" | "caption">[];
  menu: Pick<MenuItemRow, "id" | "name" | "price" | "category">[];
};

/** One shop with photos and menu; null when missing or not visible to the caller. */
export async function getShopBySlug(db: Db, slug: string): Promise<ShopDetail | null> {
  const card = unwrap(await db.from("shop_cards").select("*").eq("slug", slug).maybeSingle());
  const base = card ? toCard(card) : null;
  if (!base) return null;
  const [shop, photos, menu] = await Promise.all([
    db
      .from("shops")
      .select("description, phone, facebook_url, instagram_url, website, source, osm_id")
      .eq("id", base.id)
      .single(),
    db
      .from("shop_photos")
      .select("id, storage_path, caption")
      .eq("shop_id", base.id)
      .order("sort_order"),
    db
      .from("menu_items")
      .select("id, name, price, category")
      .eq("shop_id", base.id)
      .order("sort_order"),
  ]);
  const extra =
    unwrap<
      Pick<
        ShopRow,
        "description" | "phone" | "facebook_url" | "instagram_url" | "website" | "source" | "osm_id"
      >
    >(shop);
  return {
    ...base,
    description: extra.description,
    phone: extra.phone,
    facebookUrl: extra.facebook_url,
    instagramUrl: extra.instagram_url,
    website: extra.website,
    source: extra.source,
    osmId: extra.osm_id,
    photos: unwrap(photos),
    menu: unwrap(menu),
  };
}

/** Slugs of every published shop (sitemap, static params). */
export async function listPublishedSlugs(db: Db) {
  const rows = unwrap(await db.from("shops").select("slug, updated_at").eq("status", "published"));
  return rows;
}

/**
 * Public URL of a photo in the `shop-photos` bucket, built from the project URL alone (no client,
 * so it is safe to call while rendering). With a size it uses Supabase image transforms.
 */
export function shopPhotoUrl(
  supabaseUrl: string,
  storagePath: string,
  opts?: { width?: number; height?: number },
) {
  const base = supabaseUrl.replace(/\/+$/, "");
  const path = storagePath.split("/").map(encodeURIComponent).join("/");
  if (!opts) return `${base}/storage/v1/object/public/shop-photos/${path}`;
  const qs = new URLSearchParams({ resize: "cover" });
  if (opts.width) qs.set("width", String(opts.width));
  if (opts.height) qs.set("height", String(opts.height));
  return `${base}/storage/v1/render/image/public/shop-photos/${path}?${qs}`;
}
