"use server";

import { expireShops, NotAdminError, requireAdmin } from "@/lib/admin-server";
import { approvePhoto, rejectPhoto } from "@/lib/db";

export async function reviewPhotoAction(
  id: string,
  decision: "approve" | "reject",
): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!/^[0-9a-f-]{36}$/i.test(id) || (decision !== "approve" && decision !== "reject")) {
      return { ok: false, error: "Bad request" };
    }
    const { db, userId } = await requireAdmin();
    if (decision === "reject") {
      const done = await rejectPhoto(db, id, userId);
      return done ? { ok: true } : { ok: false, error: "Already reviewed" };
    }
    const slug = await approvePhoto(db, id, userId);
    if (slug === null) return { ok: false, error: "Already reviewed" };
    if (slug) expireShops([slug]);
    return { ok: true };
  } catch (err) {
    if (err instanceof NotAdminError) return { ok: false, error: "Admins only" };
    console.error("[admin] photo review", err);
    return { ok: false, error: "Couldn't save. Try again." };
  }
}
