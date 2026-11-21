/**
 * Admin data access. Uses the signed-in admin's client: RLS admin policies allow full access,
 * so nothing here needs the service-role key. Framework-free.
 */
import type { PriceTier, Province, ShopType } from "../categories";
import { slugify } from "../osm";
import { parsePoint } from "./cities";
import {
  unwrap,
  type Db,
  type MenuItemRow,
  type ShopPhotoRow,
  type ShopRow,
  type SubmissionRow,
} from "./client";
import { parseHours, type WeeklyHours } from "./hours";
import type { Json, TablesInsert, TablesUpdate } from "./types";

export type ShopStatus = ShopRow["status"];
export type SubmissionKind = SubmissionRow["kind"];
export type SubmissionStatus = SubmissionRow["status"];

// --- profile --------------------------------------------------------------------------------

export async function getProfileRole(db: Db, userId: string) {
  const row = unwrap<{ role: "admin" | "owner" | "user"; display_name: string | null } | null>(
    await db.from("profiles").select("role, display_name").eq("id", userId).maybeSingle(),
  );
  return row ?? null;
}

// --- dashboard ------------------------------------------------------------------------------

async function count(q: PromiseLike<{ count: number | null; error: { message: string } | null }>) {
  const { count: n, error } = await q;
  if (error) throw new Error(error.message);
  return n ?? 0;
}

export async function getAdminCounts(db: Db) {
  const shops = () => db.from("shops").select("id", { count: "exact", head: true });
  const subs = () => db.from("submissions").select("id", { count: "exact", head: true });
  const [
    published,
    draft,
    hidden,
    imported,
    pendingNew,
    pendingClaim,
    pendingCorrection,
    specialty,
    chain,
    kapihan,
  ] = await Promise.all([
    count(shops().eq("status", "published")),
    count(shops().eq("status", "draft")),
    count(shops().eq("status", "hidden")),
    count(shops().eq("status", "draft").eq("source", "import_osm")),
    count(subs().eq("status", "pending").eq("kind", "new_shop")),
    count(subs().eq("status", "pending").eq("kind", "claim")),
    count(subs().eq("status", "pending").eq("kind", "correction")),
    count(shops().eq("status", "published").eq("type", "specialty")),
    count(shops().eq("status", "published").eq("type", "chain")),
    count(shops().eq("status", "published").eq("type", "kapihan")),
  ]);
  return {
    shops: { published, draft, hidden, imported },
    pending: { new_shop: pendingNew, claim: pendingClaim, correction: pendingCorrection },
    publishedByType: { specialty, chain, kapihan },
  };
}

// --- shops table ----------------------------------------------------------------------------

export type AdminShopRow = {
  id: string;
  slug: string;
  name: string;
  type: ShopType | null;
  priceTier: PriceTier | null;
  lattePrice: number | null;
  status: ShopStatus;
  source: ShopRow["source"];
  cityName: string | null;
  updatedAt: string;
  ready: boolean; // categorized enough to publish
};

export type AdminShopQuery = {
  q?: string;
  status?: ShopStatus;
  type?: ShopType | "none";
  page?: number;
  pageSize?: number;
};

export async function listAdminShops(db: Db, query: AdminShopQuery) {
  const pageSize = query.pageSize ?? 25;
  const page = Math.max(1, query.page ?? 1);
  let req = db
    .from("shops")
    .select(
      "id, slug, name, type, price_tier, latte_price, status, source, province, updated_at, cities(name)",
      {
        count: "exact",
      },
    )
    .order("updated_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (query.q?.trim()) req = req.ilike("name", `%${query.q.trim().replace(/[%_]/g, "\\$&")}%`);
  if (query.status) req = req.eq("status", query.status);
  if (query.type === "none") req = req.is("type", null);
  else if (query.type) req = req.eq("type", query.type);

  const { data, count: total, error } = await req;
  if (error) throw new Error(error.message);
  const rows: AdminShopRow[] = (data ?? []).map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    type: r.type,
    priceTier: r.price_tier as PriceTier | null,
    lattePrice: r.latte_price,
    status: r.status,
    source: r.source,
    cityName: (r.cities as { name: string } | null)?.name ?? null,
    updatedAt: r.updated_at,
    ready: !!(r.type && r.price_tier && r.province),
  }));
  return { rows, total: total ?? 0, page, pageSize };
}

/**
 * Set status on many shops. Publishing skips shops that aren't categorized yet (the DB would
 * reject them). Returns the slugs that changed and the ones skipped.
 */
export async function setShopsStatus(db: Db, ids: string[], status: ShopStatus) {
  if (ids.length === 0) return { changed: [] as string[], skipped: [] as string[] };
  const rows = unwrap(
    await db.from("shops").select("id, slug, type, price_tier, province").in("id", ids),
  );
  const ok =
    status === "published" ? rows.filter((r) => r.type && r.price_tier && r.province) : rows;
  const skipped = rows.filter((r) => !ok.includes(r)).map((r) => r.slug);
  if (ok.length) {
    unwrap(
      await db
        .from("shops")
        .update({ status })
        .in(
          "id",
          ok.map((r) => r.id),
        )
        .select("id"),
    );
  }
  return { changed: ok.map((r) => r.slug), skipped };
}

// --- shop editor ----------------------------------------------------------------------------

export type AdminShop = {
  id: string;
  slug: string;
  name: string;
  type: ShopType | null;
  priceTier: PriceTier | null;
  lattePrice: number | null;
  description: string | null;
  address: string | null;
  cityId: string | null;
  province: Province | null;
  lat: number;
  lng: number;
  hours: WeeklyHours | null;
  phone: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  website: string | null;
  googlePlaceId: string | null;
  status: ShopStatus;
  source: ShopRow["source"];
  osmId: string | null;
  verifiedAt: string | null;
  claimedBy: string | null;
  updatedAt: string;
  photos: Pick<ShopPhotoRow, "id" | "storage_path" | "caption" | "sort_order">[];
  menu: Pick<MenuItemRow, "id" | "name" | "price" | "category" | "sort_order">[];
};

export async function getAdminShop(db: Db, id: string): Promise<AdminShop | null> {
  const row = unwrap<ShopRow | null>(await db.from("shops").select("*").eq("id", id).maybeSingle());
  if (!row) return null;
  const [photos, menu] = await Promise.all([
    db
      .from("shop_photos")
      .select("id, storage_path, caption, sort_order")
      .eq("shop_id", id)
      .order("sort_order"),
    db
      .from("menu_items")
      .select("id, name, price, category, sort_order")
      .eq("shop_id", id)
      .order("sort_order"),
  ]);
  const point = parsePoint(row.location) ?? { lat: 10.6765, lng: 122.9509 };
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    type: row.type,
    priceTier: row.price_tier as PriceTier | null,
    lattePrice: row.latte_price,
    description: row.description,
    address: row.address,
    cityId: row.city_id,
    province: row.province,
    ...point,
    hours: parseHours(row.hours),
    phone: row.phone,
    facebookUrl: row.facebook_url,
    instagramUrl: row.instagram_url,
    website: row.website,
    googlePlaceId: row.google_place_id,
    status: row.status,
    source: row.source,
    osmId: row.osm_id,
    verifiedAt: row.verified_at,
    claimedBy: row.claimed_by,
    updatedAt: row.updated_at,
    photos: unwrap(photos),
    menu: unwrap(menu),
  };
}

export type ShopEdit = {
  name: string;
  slug: string;
  type: ShopType | null;
  lattePrice: number | null;
  /** null = auto from latte price. */
  priceTier: PriceTier | null;
  description: string | null;
  address: string | null;
  cityId: string | null;
  province: Province | null;
  lat: number;
  lng: number;
  hours: WeeklyHours | null;
  phone: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  website: string | null;
  googlePlaceId: string | null;
  status: ShopStatus;
  verified: boolean;
};

function editToRow(e: ShopEdit, previousVerifiedAt: string | null) {
  return {
    name: e.name,
    slug: e.slug,
    type: e.type,
    latte_price: e.lattePrice,
    // An explicit tier is an admin override; null lets the DB trigger derive it from the price.
    price_tier: e.priceTier,
    description: e.description,
    address: e.address,
    city_id: e.cityId,
    province: e.province,
    location: `SRID=4326;POINT(${e.lng} ${e.lat})`,
    hours: e.hours as Json,
    phone: e.phone,
    facebook_url: e.facebookUrl,
    instagram_url: e.instagramUrl,
    website: e.website,
    google_place_id: e.googlePlaceId,
    status: e.status,
    verified_at: e.verified ? (previousVerifiedAt ?? new Date().toISOString()) : null,
  } satisfies TablesUpdate<"shops">;
}

export async function createShop(db: Db, edit: ShopEdit): Promise<{ id: string; slug: string }> {
  const row = unwrap<{ id: string; slug: string }>(
    await db
      .from("shops")
      .insert({ ...editToRow(edit, null), source: "admin" } satisfies TablesInsert<"shops">)
      .select("id, slug")
      .single(),
  );
  return row;
}

export async function updateShop(
  db: Db,
  id: string,
  edit: ShopEdit,
  previousVerifiedAt: string | null,
) {
  return unwrap<{ id: string; slug: string }>(
    await db
      .from("shops")
      .update(editToRow(edit, previousVerifiedAt))
      .eq("id", id)
      .select("id, slug")
      .single(),
  );
}

export async function slugTaken(db: Db, slug: string, exceptId?: string) {
  let q = db.from("shops").select("id").eq("slug", slug);
  if (exceptId) q = q.neq("id", exceptId);
  return unwrap(await q).length > 0;
}

export async function deleteShop(db: Db, id: string) {
  const photos = unwrap(await db.from("shop_photos").select("storage_path").eq("shop_id", id));
  unwrap(await db.from("shops").delete().eq("id", id).select("id"));
  if (photos.length) await db.storage.from("shop-photos").remove(photos.map((p) => p.storage_path));
}

export type MenuEdit = { name: string; price: number; category: string | null };

/** Replace the whole menu (simple and atomic enough for a short list). */
export async function replaceMenu(db: Db, shopId: string, items: MenuEdit[]) {
  unwrap(await db.from("menu_items").delete().eq("shop_id", shopId).select("id"));
  if (items.length) {
    unwrap(
      await db
        .from("menu_items")
        .insert(
          items.map((m, i) => ({
            shop_id: shopId,
            name: m.name,
            price: m.price,
            category: m.category,
            sort_order: i,
          })),
        )
        .select("id"),
    );
  }
}

// --- photos ---------------------------------------------------------------------------------

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export async function addShopPhoto(
  db: Db,
  shopId: string,
  file: Blob & { type: string },
  caption?: string | null,
) {
  const ext = EXT[file.type];
  if (!ext) throw new Error("Unsupported image type");
  const path = `${shopId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await db.storage
    .from("shop-photos")
    .upload(path, file, { contentType: file.type });
  if (error) throw new Error(error.message);
  const existing = unwrap(await db.from("shop_photos").select("sort_order").eq("shop_id", shopId));
  const next = existing.reduce((m, r) => Math.max(m, r.sort_order + 1), 0);
  unwrap(
    await db
      .from("shop_photos")
      .insert({ shop_id: shopId, storage_path: path, caption: caption ?? null, sort_order: next })
      .select("id"),
  );
  return path;
}

export async function deleteShopPhoto(db: Db, photoId: string) {
  const row = unwrap<{ storage_path: string }>(
    await db.from("shop_photos").delete().eq("id", photoId).select("storage_path").single(),
  );
  await db.storage.from("shop-photos").remove([row.storage_path]);
}

/** Persist a new order; the first photo is the cover. */
export async function reorderShopPhotos(db: Db, shopId: string, orderedIds: string[]) {
  await Promise.all(
    orderedIds.map((id, i) =>
      db
        .from("shop_photos")
        .update({ sort_order: i })
        .eq("id", id)
        .eq("shop_id", shopId)
        .select("id")
        .then(unwrap),
    ),
  );
}

// --- submissions ----------------------------------------------------------------------------

export type AdminSubmission = {
  id: string;
  kind: SubmissionKind;
  status: SubmissionStatus;
  payload: Record<string, unknown>;
  shop: { id: string; slug: string; name: string } | null;
  submitterId: string | null;
  submitterName: string | null;
  submitterEmail: string | null;
  proofPath: string | null;
  notes: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

export async function listSubmissions(
  db: Db,
  filter: { status?: SubmissionStatus; kind?: SubmissionKind; limit?: number },
): Promise<AdminSubmission[]> {
  let q = db
    .from("submissions")
    .select("*, shops(id, slug, name)")
    .order("created_at", { ascending: filter.status === "pending" })
    .limit(filter.limit ?? 50);
  if (filter.status) q = q.eq("status", filter.status);
  if (filter.kind) q = q.eq("kind", filter.kind);
  const rows = unwrap(await q);
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    status: r.status,
    payload: (r.payload ?? {}) as Record<string, unknown>,
    shop: (r.shops as { id: string; slug: string; name: string } | null) ?? null,
    submitterId: r.submitter_id,
    submitterName: r.submitter_name,
    submitterEmail: r.submitter_email,
    proofPath: r.proof_url,
    notes: r.notes,
    createdAt: r.created_at,
    reviewedAt: r.reviewed_at,
  }));
}

export async function getSubmission(db: Db, id: string) {
  return unwrap<
    (SubmissionRow & { shops: { id: string; slug: string; name: string } | null }) | null
  >(await db.from("submissions").select("*, shops(id, slug, name)").eq("id", id).maybeSingle());
}

/** Short-lived link to a private proof photo. */
export async function proofUrl(db: Db, path: string, expiresInSec = 600) {
  const { data, error } = await db.storage
    .from("submission-proofs")
    .createSignedUrl(path, expiresInSec);
  return error ? null : data.signedUrl;
}

export async function reviewSubmission(
  db: Db,
  id: string,
  status: Exclude<SubmissionStatus, "pending">,
  reviewerId: string,
  notes: string | null,
) {
  unwrap(
    await db
      .from("submissions")
      .update({ status, reviewed_by: reviewerId, reviewed_at: new Date().toISOString(), notes })
      .eq("id", id)
      .select("id"),
  );
}

/** Approve a claim: mark the shop verified, link the claimant's account and make them an owner. */
export async function approveClaim(db: Db, shopId: string, submitterId: string | null) {
  unwrap(
    await db
      .from("shops")
      .update({
        verified_at: new Date().toISOString(),
        ...(submitterId ? { claimed_by: submitterId } : {}),
      })
      .eq("id", shopId)
      .select("id"),
  );
  if (submitterId) {
    const profile = await getProfileRole(db, submitterId);
    if (profile && profile.role === "user") {
      unwrap(
        await db.from("profiles").update({ role: "owner" }).eq("id", submitterId).select("id"),
      );
    }
  }
}

/** Turn an approved "new shop" suggestion into a draft shop. Returns the new shop id. */
export async function createDraftFromSuggestion(
  db: Db,
  payload: Record<string, unknown>,
): Promise<string> {
  const str = (k: string) =>
    typeof payload[k] === "string" && payload[k] ? (payload[k] as string) : null;
  const name = (str("name") ?? "Suggested shop").slice(0, 120);
  const citySlug = str("city_slug");
  const city = citySlug
    ? unwrap<{ id: string; name: string; province: Province; center: unknown } | null>(
        await db
          .from("cities")
          .select("id, name, province, center")
          .eq("slug", citySlug)
          .maybeSingle(),
      )
    : null;
  const loc = payload.location as { lat?: number; lng?: number } | undefined;
  const point =
    loc && typeof loc.lat === "number" && typeof loc.lng === "number"
      ? { lat: loc.lat, lng: loc.lng }
      : (parsePoint(city?.center) ?? { lat: 10.6765, lng: 122.9509 }); // city center, else Bacolod

  const base = slugify(city ? `${name} ${city.name}` : name);
  let slug = base;
  for (let n = 2; await slugExists(db, slug); n++) slug = `${base}-${n}`;

  const type = str("type");
  const latte = typeof payload.latte_price === "number" ? payload.latte_price : null;
  const notes = [str("hours") && `Hours (suggested): ${str("hours")}`, str("notes")]
    .filter(Boolean)
    .join("\n");
  const row = unwrap<{ id: string }>(
    await db
      .from("shops")
      .insert({
        name,
        slug,
        type: type === "specialty" || type === "chain" || type === "kapihan" ? type : null,
        latte_price: latte,
        address: str("address"),
        city_id: city?.id ?? null,
        province: city?.province ?? null,
        location: `SRID=4326;POINT(${point.lng} ${point.lat})`,
        facebook_url: str("facebook_url"),
        instagram_url: str("instagram_url"),
        description: notes || null,
        status: "draft",
        source: "admin",
      })
      .select("id")
      .single(),
  );
  return row.id;
}

async function slugExists(db: Db, slug: string) {
  return unwrap(await db.from("shops").select("id").eq("slug", slug)).length > 0;
}

// --- quick review of drafts ---------------------------------------------------------------

export type ReviewDraft = {
  id: string;
  slug: string;
  name: string;
  type: ShopType | null;
  lattePrice: number | null;
  province: Province | null;
  cityName: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  osmId: string | null;
  lat: number | null;
  lng: number | null;
};

/** Drafts to review, grouped by province and town so nearby shops come together. */
export async function listDraftsForReview(db: Db, opts: { limit?: number; town?: string } = {}) {
  let q = db
    .from("shops")
    .select(
      "id, slug, name, type, latte_price, province, address, phone, website, osm_id, location, cities(name)",
      { count: "exact" },
    )
    .eq("status", "draft")
    .order("province", { ascending: true, nullsFirst: false })
    .order("city_id", { ascending: true, nullsFirst: false })
    .order("name")
    .limit(opts.limit ?? 30);
  if (opts.town) q = q.eq("city_id", opts.town);
  const { data, count: total, error } = await q;
  if (error) throw new Error(error.message);
  const drafts: ReviewDraft[] = (data ?? []).map((r) => {
    const p = parsePoint(r.location);
    return {
      id: r.id,
      slug: r.slug,
      name: r.name,
      type: r.type,
      lattePrice: r.latte_price,
      province: r.province,
      cityName: (r.cities as { name: string } | null)?.name ?? null,
      address: r.address,
      phone: r.phone,
      website: r.website,
      osmId: r.osm_id,
      lat: p?.lat ?? null,
      lng: p?.lng ?? null,
    };
  });
  return { drafts, total: total ?? 0 };
}

export type QuickDecision = {
  status: "published" | "hidden";
  type: ShopType | null;
  lattePrice: number | null;
  priceTier: PriceTier | null;
};

/**
 * Publish or hide a draft in one step. Publishing needs a type, a tier (or latte price, which
 * the DB turns into a tier) and a province; returns a reason instead of throwing when not.
 */
export async function quickReviewShop(
  db: Db,
  id: string,
  d: QuickDecision,
): Promise<{ ok: true; slug: string } | { ok: false; reason: string }> {
  const row = unwrap<{ slug: string; province: Province | null; status: ShopStatus } | null>(
    await db.from("shops").select("slug, province, status").eq("id", id).maybeSingle(),
  );
  if (!row) return { ok: false, reason: "Shop not found" };
  if (d.status === "published") {
    if (!d.type) return { ok: false, reason: "Pick a type first" };
    if (!d.priceTier && d.lattePrice == null)
      return { ok: false, reason: "Add a latte price or pick a tier" };
    if (!row.province)
      return { ok: false, reason: "No town/province yet: open the full editor to set it" };
  }
  unwrap(
    await db
      .from("shops")
      .update({
        status: d.status,
        ...(d.type ? { type: d.type } : {}),
        ...(d.lattePrice != null ? { latte_price: d.lattePrice } : {}),
        // Explicit tier wins; otherwise leave null so the trigger derives it from the price.
        price_tier: d.priceTier ?? null,
      })
      .eq("id", id)
      .select("id"),
  );
  return { ok: true, slug: row.slug };
}
