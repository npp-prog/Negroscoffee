/**
 * Reviews (1–5 stars + text, one per user per shop), owner replies, moderation, and saved
 * shops (favorites / visited). RLS and triggers in migration 20261122000002 enforce the rules.
 * Framework-free.
 */
import { unwrap, type Db } from "./client";

export type ReviewStatus = "visible" | "hidden";

export type Review = {
  id: string;
  shopId: string;
  userId: string;
  authorName: string;
  rating: number;
  body: string | null;
  status: ReviewStatus;
  ownerReply: string | null;
  ownerRepliedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type ReviewRowLike = {
  id: string;
  shop_id: string;
  user_id: string;
  author_name: string;
  rating: number;
  body: string | null;
  status: string;
  owner_reply: string | null;
  owner_replied_at: string | null;
  created_at: string;
  updated_at: string;
};

const REVIEW_COLS =
  "id, shop_id, user_id, author_name, rating, body, status, owner_reply, owner_replied_at, created_at, updated_at";

export function toReview(r: ReviewRowLike): Review {
  return {
    id: r.id,
    shopId: r.shop_id,
    userId: r.user_id,
    authorName: r.author_name,
    rating: r.rating,
    body: r.body,
    status: r.status === "hidden" ? "hidden" : "visible",
    ownerReply: r.owner_reply,
    ownerRepliedAt: r.owner_replied_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/** Reviews of a shop, newest first. Anon clients see visible ones only (RLS). */
export async function listShopReviews(db: Db, shopId: string, limit = 30): Promise<Review[]> {
  const rows = unwrap<ReviewRowLike[]>(
    await db
      .from("reviews")
      .select(REVIEW_COLS)
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false })
      .limit(limit),
  );
  return rows.map(toReview);
}

export async function getMyReview(db: Db, shopId: string, userId: string): Promise<Review | null> {
  const row = unwrap<ReviewRowLike | null>(
    await db
      .from("reviews")
      .select(REVIEW_COLS)
      .eq("shop_id", shopId)
      .eq("user_id", userId)
      .maybeSingle(),
  );
  return row ? toReview(row) : null;
}

/** Create or update the caller's review of a shop. */
export async function saveMyReview(
  db: Db,
  input: { shopId: string; userId: string; rating: number; body: string | null },
): Promise<"created" | "updated"> {
  const existing = await getMyReview(db, input.shopId, input.userId);
  if (existing) {
    unwrap(
      await db
        .from("reviews")
        .update({ rating: input.rating, body: input.body })
        .eq("id", existing.id)
        .select("id"),
    );
    return "updated";
  }
  unwrap(
    await db
      .from("reviews")
      .insert({
        shop_id: input.shopId,
        user_id: input.userId,
        rating: input.rating,
        body: input.body,
      })
      .select("id"),
  );
  return "created";
}

export async function deleteMyReview(db: Db, shopId: string, userId: string) {
  unwrap(
    await db.from("reviews").delete().eq("shop_id", shopId).eq("user_id", userId).select("id"),
  );
}

/** Owner reply (null removes it). */
export async function replyToReview(db: Db, reviewId: string, reply: string | null) {
  return unwrap<{ id: string; shop_id: string }>(
    await db
      .from("reviews")
      .update({ owner_reply: reply })
      .eq("id", reviewId)
      .select("id, shop_id")
      .single(),
  );
}

export async function setReviewStatus(db: Db, reviewId: string, status: ReviewStatus) {
  return unwrap<{ id: string; shop_id: string }>(
    await db.from("reviews").update({ status }).eq("id", reviewId).select("id, shop_id").single(),
  );
}

export type AdminReview = Review & { shop: { id: string; slug: string; name: string } | null };

/** Latest reviews across shops (admins see all statuses via RLS). */
export async function listRecentReviews(
  db: Db,
  opts: { status?: ReviewStatus; limit?: number } = {},
): Promise<AdminReview[]> {
  let q = db
    .from("reviews")
    .select(`${REVIEW_COLS}, shops(id, slug, name)`)
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 50);
  if (opts.status) q = q.eq("status", opts.status);
  const rows = unwrap<
    (ReviewRowLike & { shops: { id: string; slug: string; name: string } | null })[]
  >(await q);
  return rows.map((r) => ({ ...toReview(r), shop: r.shops }));
}

// --- saved shops --------------------------------------------------------------------------

export type SavedKind = "favorite" | "visited";

/** Which of favorite / visited the user has set for a shop. */
export async function getSavedKinds(db: Db, userId: string, shopId: string): Promise<SavedKind[]> {
  const rows = unwrap<{ kind: string }[]>(
    await db.from("saved_shops").select("kind").eq("user_id", userId).eq("shop_id", shopId),
  );
  return rows.map((r) => r.kind).filter((k): k is SavedKind => k === "favorite" || k === "visited");
}

export async function setSaved(
  db: Db,
  userId: string,
  shopId: string,
  kind: SavedKind,
  on: boolean,
) {
  if (on) {
    const { error } = await db
      .from("saved_shops")
      .insert({ user_id: userId, shop_id: shopId, kind });
    // Already saved is fine.
    if (error && !/duplicate key/.test(error.message)) throw new Error(error.message);
  } else {
    unwrap(
      await db
        .from("saved_shops")
        .delete()
        .eq("user_id", userId)
        .eq("shop_id", shopId)
        .eq("kind", kind)
        .select("shop_id"),
    );
  }
}

/** Shop ids the user saved, newest first, per kind. */
export async function listSavedShopIds(
  db: Db,
  userId: string,
): Promise<Record<SavedKind, string[]>> {
  const rows = unwrap<{ shop_id: string; kind: string }[]>(
    await db
      .from("saved_shops")
      .select("shop_id, kind")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  );
  return {
    favorite: rows.filter((r) => r.kind === "favorite").map((r) => r.shop_id),
    visited: rows.filter((r) => r.kind === "visited").map((r) => r.shop_id),
  };
}

/** "★ 4.6" style label; null when there are no ratings. */
export function ratingLabel(
  avg: number | null | undefined,
  count: number | null | undefined,
): string | null {
  if (!count || avg == null) return null;
  return `${Number(avg).toFixed(1)}`;
}
