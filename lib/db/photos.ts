/**
 * Visitor photos: signed-in visitors upload into the private `photo-submissions` bucket; admins
 * approve (copy into `shop-photos` with a credit line) or reject. Rules live in migration
 * 20261122000005. Framework-free.
 */
import { unwrap, type Db } from "./client";

export type PhotoSubmissionStatus = "pending" | "approved" | "rejected";

const PRIVATE = "photo-submissions";
const PUBLIC = "shop-photos";
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const SIGNED_TTL = 60 * 60;

export const VISITOR_PHOTO_TYPES = Object.keys(EXT);

/** Upload a visitor's photo and queue it for review. Returns the submission id. */
export async function submitVisitorPhoto(
  db: Db,
  input: { shopId: string; userId: string; file: Blob & { type: string }; caption: string | null },
): Promise<string> {
  const ext = EXT[input.file.type];
  if (!ext) throw new Error("Unsupported image type");
  const path = `${input.userId}/${crypto.randomUUID()}.${ext}`;
  const up = await db.storage
    .from(PRIVATE)
    .upload(path, input.file, { contentType: input.file.type, upsert: false });
  if (up.error) throw new Error(up.error.message);
  const { data, error } = await db
    .from("photo_submissions")
    .insert({
      shop_id: input.shopId,
      user_id: input.userId,
      storage_path: path,
      caption: input.caption,
    })
    .select("id")
    .single();
  if (error || !data) {
    await db.storage.from(PRIVATE).remove([path]);
    throw new Error(error?.message ?? "Couldn't save the photo");
  }
  return data.id;
}

async function signedUrls(db: Db, paths: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!paths.length) return out;
  const { data } = await db.storage.from(PRIVATE).createSignedUrls(paths, SIGNED_TTL);
  for (const row of data ?? []) if (row.path && row.signedUrl) out.set(row.path, row.signedUrl);
  return out;
}

export type MyPhoto = {
  id: string;
  status: PhotoSubmissionStatus;
  caption: string | null;
  createdAt: string;
  shopName: string;
  shopSlug: string;
  /** Signed URL of the private file while pending; null once reviewed. */
  previewUrl: string | null;
  /** Path in shop-photos once approved. */
  publicPath: string | null;
};

type SubRow = {
  id: string;
  shop_id: string;
  user_id: string;
  storage_path: string;
  caption: string | null;
  status: string;
  photo_id: string | null;
  created_at: string;
  shops: { name: string; slug: string } | null;
};

const SUB_COLS =
  "id, shop_id, user_id, storage_path, caption, status, photo_id, created_at, shops(name, slug)";

/** The signed-in visitor's own photos, newest first. */
export async function listMyPhotos(db: Db, userId: string, limit = 30): Promise<MyPhoto[]> {
  const rows = unwrap<SubRow[]>(
    await db
      .from("photo_submissions")
      .select(SUB_COLS)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit),
  );
  const pending = rows.filter((r) => r.status === "pending").map((r) => r.storage_path);
  const photoIds = rows.map((r) => r.photo_id).filter((x): x is string => !!x);
  const [urls, published] = await Promise.all([
    signedUrls(db, pending),
    photoIds.length
      ? db.from("shop_photos").select("id, storage_path").in("id", photoIds)
      : Promise.resolve({ data: [] as { id: string; storage_path: string }[] }),
  ]);
  const pub = new Map((published.data ?? []).map((p) => [p.id, p.storage_path]));
  return rows.map((r) => ({
    id: r.id,
    status: r.status as PhotoSubmissionStatus,
    caption: r.caption,
    createdAt: r.created_at,
    shopName: r.shops?.name ?? "A shop",
    shopSlug: r.shops?.slug ?? "",
    previewUrl: r.status === "pending" ? (urls.get(r.storage_path) ?? null) : null,
    publicPath: r.photo_id ? (pub.get(r.photo_id) ?? null) : null,
  }));
}

/** Withdraw one of your own pending photos. */
export async function deleteMyPendingPhoto(db: Db, id: string): Promise<void> {
  const rows = unwrap<{ storage_path: string }[]>(
    await db
      .from("photo_submissions")
      .delete()
      .eq("id", id)
      .eq("status", "pending")
      .select("storage_path"),
  );
  if (rows.length) await db.storage.from(PRIVATE).remove(rows.map((r) => r.storage_path));
}

// --- admin ------------------------------------------------------------------------------------

export type PendingPhoto = {
  id: string;
  shopId: string;
  shopName: string;
  shopSlug: string;
  caption: string | null;
  createdAt: string;
  contributor: string;
  previewUrl: string | null;
};

export async function countPendingPhotos(db: Db): Promise<number> {
  const { count, error } = await db
    .from("photo_submissions")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function displayNames(db: Db, ids: string[]): Promise<Map<string, string | null>> {
  if (!ids.length) return new Map();
  const rows = unwrap<{ id: string; display_name: string | null }[]>(
    await db
      .from("profiles")
      .select("id, display_name")
      .in("id", [...new Set(ids)]),
  );
  return new Map(rows.map((r) => [r.id, r.display_name]));
}

/** Oldest first, so nothing waits forever. */
export async function listPendingPhotos(db: Db, limit = 24): Promise<PendingPhoto[]> {
  const rows = unwrap<SubRow[]>(
    await db
      .from("photo_submissions")
      .select(SUB_COLS)
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(limit),
  );
  const [urls, names] = await Promise.all([
    signedUrls(
      db,
      rows.map((r) => r.storage_path),
    ),
    displayNames(
      db,
      rows.map((r) => r.user_id),
    ),
  ]);
  return rows.map((r) => ({
    id: r.id,
    shopId: r.shop_id,
    shopName: r.shops?.name ?? "Unknown shop",
    shopSlug: r.shops?.slug ?? "",
    caption: r.caption,
    createdAt: r.created_at,
    contributor: names.get(r.user_id) || "Coffee lover",
    previewUrl: urls.get(r.storage_path) ?? null,
  }));
}

/**
 * Publish a pending photo: copy it into shop-photos (added last, so the cover doesn't change),
 * credit the contributor, mark approved and delete the private copy. Returns the shop slug, or
 * null if it was already reviewed.
 */
/**
 * Claim a pending submission for review (pending → status) in one conditional update, so two
 * admins (or a double tap) can't both act on it and a visitor can't withdraw it mid-review.
 */
async function claim(
  db: Db,
  id: string,
  adminId: string,
  status: "approved" | "rejected",
): Promise<SubRow | null> {
  const rows = unwrap<SubRow[]>(
    await db
      .from("photo_submissions")
      .update({ status, reviewed_by: adminId, reviewed_at: new Date().toISOString() })
      .eq("id", id)
      .eq("status", "pending")
      .select(SUB_COLS),
  );
  return rows[0] ?? null;
}

export async function approvePhoto(db: Db, id: string, adminId: string): Promise<string | null> {
  const sub = await claim(db, id, adminId, "approved");
  if (!sub) return null;
  let path: string | null = null;
  try {
    const file = await db.storage.from(PRIVATE).download(sub.storage_path);
    if (file.error || !file.data) throw new Error(file.error?.message ?? "Photo file is missing");
    const ext = sub.storage_path.split(".").pop() ?? "jpg";
    const type =
      file.data.type || Object.entries(EXT).find(([, e]) => e === ext)?.[0] || "image/jpeg";
    path = `${sub.shop_id}/${crypto.randomUUID()}.${ext}`;
    const up = await db.storage.from(PUBLIC).upload(path, file.data, { contentType: type });
    if (up.error) {
      path = null;
      throw new Error(up.error.message);
    }

    const name = (await displayNames(db, [sub.user_id])).get(sub.user_id);
    const existing = unwrap(
      await db.from("shop_photos").select("sort_order").eq("shop_id", sub.shop_id),
    );
    const next = existing.reduce((m, r) => Math.max(m, r.sort_order + 1), 0);
    const photo = unwrap<{ id: string }>(
      await db
        .from("shop_photos")
        .insert({
          shop_id: sub.shop_id,
          storage_path: path,
          caption: sub.caption,
          sort_order: next,
          credit: (name || "Coffee lover").slice(0, 80),
          contributed_by: sub.user_id,
        })
        .select("id")
        .single(),
    );
    unwrap(
      await db.from("photo_submissions").update({ photo_id: photo.id }).eq("id", id).select("id"),
    );
  } catch (err) {
    // Put it back in the queue and drop any half-copied file.
    if (path) await db.storage.from(PUBLIC).remove([path]);
    await db
      .from("photo_submissions")
      .update({ status: "pending", reviewed_by: null, reviewed_at: null })
      .eq("id", id);
    throw err;
  }
  await db.storage.from(PRIVATE).remove([sub.storage_path]);
  return sub.shops?.slug ?? null;
}

/** Decline a pending photo and delete the file (the row stays so the visitor sees the outcome). */
export async function rejectPhoto(db: Db, id: string, adminId: string): Promise<boolean> {
  const sub = await claim(db, id, adminId, "rejected");
  if (!sub) return false;
  await db.storage.from(PRIVATE).remove([sub.storage_path]);
  return true;
}
