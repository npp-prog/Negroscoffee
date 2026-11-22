/**
 * Owner self-service: verified owners edit their own shops' everyday details. RLS policies and
 * the shops_guard_owner_edit trigger enforce what an owner may change. Framework-free.
 */
import type { PriceTier } from "../categories";
import { unwrap, type Db, type ShopRow } from "./client";
import type { WeeklyHours } from "./hours";
import type { Json } from "./types";

export type OwnedShop = {
  id: string;
  slug: string;
  name: string;
  status: ShopRow["status"];
  priceTier: PriceTier | null;
  lattePrice: number | null;
  cityName: string | null;
  verifiedAt: string | null;
  updatedAt: string;
};

export async function listOwnedShops(db: Db, userId: string): Promise<OwnedShop[]> {
  const rows = unwrap(
    await db
      .from("shops")
      .select(
        "id, slug, name, status, price_tier, latte_price, verified_at, updated_at, cities(name)",
      )
      .eq("claimed_by", userId)
      .order("name"),
  );
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    status: r.status,
    priceTier: r.price_tier as PriceTier | null,
    lattePrice: r.latte_price,
    cityName: (r.cities as { name: string } | null)?.name ?? null,
    verifiedAt: r.verified_at,
    updatedAt: r.updated_at,
  }));
}

export async function ownsShop(db: Db, shopId: string): Promise<boolean> {
  const { data, error } = await db.rpc("owns_shop", { p_shop_id: shopId });
  if (error) throw new Error(error.message);
  return data === true;
}

/** The fields an owner may change. Everything else is admin-only (enforced in the DB). */
export type OwnerEdit = {
  description: string | null;
  lattePrice: number | null;
  hours: WeeklyHours | null;
  phone: string | null;
  website: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
};

export async function updateOwnedShop(db: Db, id: string, e: OwnerEdit) {
  return unwrap<{ id: string; slug: string }>(
    await db
      .from("shops")
      .update({
        description: e.description,
        latte_price: e.lattePrice,
        hours: e.hours as Json,
        phone: e.phone,
        website: e.website,
        facebook_url: e.facebookUrl,
        instagram_url: e.instagramUrl,
      })
      .eq("id", id)
      .select("id, slug")
      .single(),
  );
}

/** Record a non-field change (menu, photos) in the owner edit log. */
export async function logShopEdit(
  db: Db,
  shopId: string,
  userId: string,
  changes: Record<string, Json>,
) {
  unwrap(
    await db.from("shop_edits").insert({ shop_id: shopId, user_id: userId, changes }).select("id"),
  );
}

export type ShopEditEntry = {
  id: string;
  createdAt: string;
  changes: Record<string, unknown>;
  shop: { id: string; slug: string; name: string } | null;
  editor: string | null;
};

/** Latest owner edits across all shops (admins only via RLS). */
export async function listRecentShopEdits(db: Db, limit = 10): Promise<ShopEditEntry[]> {
  const rows = unwrap(
    await db
      .from("shop_edits")
      .select("id, created_at, changes, shops(id, slug, name), profiles(display_name)")
      .order("created_at", { ascending: false })
      .limit(limit),
  );
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    changes: (r.changes ?? {}) as Record<string, unknown>,
    shop: (r.shops as { id: string; slug: string; name: string } | null) ?? null,
    editor: (r.profiles as { display_name: string | null } | null)?.display_name ?? null,
  }));
}

/** Human summary of an edit-log entry: "hours, latte price" / "menu (5 items)" / "photos added". */
export function describeShopEdit(changes: Record<string, unknown>): string {
  const label: Record<string, string> = {
    description: "description",
    latte_price: "latte price",
    hours: "hours",
    phone: "phone",
    website: "website",
    facebook_url: "Facebook",
    instagram_url: "Instagram",
  };
  const parts: string[] = [];
  if (Array.isArray(changes.fields))
    parts.push(...changes.fields.map((f) => label[String(f)] ?? String(f)));
  if (typeof changes.menu === "number")
    parts.push(`menu (${changes.menu} item${changes.menu === 1 ? "" : "s"})`);
  if (typeof changes.photos === "string") parts.push(`photos ${changes.photos}`);
  return parts.join(", ") || "details";
}

// --- admin owner linking ------------------------------------------------------------------

export async function linkOwnerByEmail(db: Db, shopId: string, email: string) {
  const { data, error } = await db.rpc("admin_link_owner", { p_shop_id: shopId, p_email: email });
  if (error) throw new Error(error.message);
  return data;
}

export async function unlinkOwner(db: Db, shopId: string) {
  const { error } = await db.rpc("admin_unlink_owner", { p_shop_id: shopId });
  if (error) throw new Error(error.message);
}

export async function getOwnerEmail(db: Db, shopId: string): Promise<string | null> {
  const { data, error } = await db.rpc("admin_owner_email", { p_shop_id: shopId });
  if (error) throw new Error(error.message);
  return data ?? null;
}
