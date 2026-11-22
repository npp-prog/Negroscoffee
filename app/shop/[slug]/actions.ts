"use server";

import { after } from "next/server";

import { expireShops, getViewer } from "@/lib/admin-server";
import { deleteMyReview, getShopCardBySlug, replyToReview, saveMyReview } from "@/lib/db";
import { notifyNewReview } from "@/lib/notifications";

export type ReviewResult = { ok: true } | { ok: false; error: string };

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

async function shopFor(slug: string) {
  if (!SLUG.test(slug)) return null;
  const { db, user } = await getViewer();
  const shop = await getShopCardBySlug(db, slug);
  return { db, user, shop };
}

/** Create or update the signed-in visitor's review of a published shop. */
export async function saveReviewAction(
  slug: string,
  rating: number,
  body: string,
): Promise<ReviewResult> {
  try {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5)
      return { ok: false, error: "Pick 1 to 5 stars." };
    const text = body.trim().slice(0, 1000) || null;
    const ctx = await shopFor(slug);
    if (!ctx?.shop) return { ok: false, error: "Shop not found." };
    if (!ctx.user) return { ok: false, error: "Sign in to leave a review." };
    const outcome = await saveMyReview(ctx.db, {
      shopId: ctx.shop.id,
      userId: ctx.user.id,
      rating,
      body: text,
    });
    expireShops([slug]);
    if (outcome === "created") {
      const shopId = ctx.shop.id;
      const userId = ctx.user.id;
      after(() => notifyNewReview({ shopId, userId }));
    }
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (/row-level security|insufficient|policy/i.test(msg)) {
      return { ok: false, error: "You can't review a shop you manage." };
    }
    console.error("[reviews] save", err);
    return { ok: false, error: "Couldn't save your review. Try again." };
  }
}

export async function deleteReviewAction(slug: string): Promise<ReviewResult> {
  try {
    const ctx = await shopFor(slug);
    if (!ctx?.shop || !ctx.user) return { ok: false, error: "Not signed in." };
    await deleteMyReview(ctx.db, ctx.shop.id, ctx.user.id);
    expireShops([slug]);
    return { ok: true };
  } catch (err) {
    console.error("[reviews] delete", err);
    return { ok: false, error: "Couldn't delete your review. Try again." };
  }
}

/** The shop's owner replies to a review (empty text removes the reply). RLS checks ownership. */
export async function replyToReviewAction(
  reviewId: string,
  slug: string,
  reply: string,
): Promise<ReviewResult> {
  try {
    if (!/^[0-9a-f-]{36}$/i.test(reviewId) || !SLUG.test(slug))
      return { ok: false, error: "Bad request." };
    const { db, user } = await getViewer();
    if (!user) return { ok: false, error: "Not signed in." };
    await replyToReview(db, reviewId, reply.trim().slice(0, 1000) || null);
    expireShops([slug]);
    return { ok: true };
  } catch (err) {
    console.error("[reviews] reply", err);
    return { ok: false, error: "Only this shop's owner can reply." };
  }
}
