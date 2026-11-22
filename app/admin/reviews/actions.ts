"use server";

import { expireShops, NotAdminError, requireAdmin } from "@/lib/admin-server";
import { getAdminShop, setReviewStatus, type ReviewStatus } from "@/lib/db";

export async function setReviewStatusAction(
  reviewId: string,
  status: ReviewStatus,
): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!/^[0-9a-f-]{36}$/i.test(reviewId) || (status !== "visible" && status !== "hidden")) {
      return { ok: false, error: "Bad request" };
    }
    const { db } = await requireAdmin();
    const row = await setReviewStatus(db, reviewId, status);
    const shop = await getAdminShop(db, row.shop_id);
    if (shop) expireShops([shop.slug]);
    return { ok: true };
  } catch (err) {
    if (err instanceof NotAdminError) return { ok: false, error: "Admins only" };
    console.error("[admin] review status", err);
    return { ok: false, error: "Couldn't update the review." };
  }
}
