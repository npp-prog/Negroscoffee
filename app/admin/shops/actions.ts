"use server";

import { expireShops, NotAdminError, requireAdmin } from "@/lib/admin-server";
import { setShopsStatus, type ShopStatus } from "@/lib/db";

const STATUSES: ShopStatus[] = ["draft", "published", "hidden"];

export type BulkResult =
  { ok: true; changed: number; skipped: string[] } | { ok: false; error: string };

export async function bulkStatusAction(ids: string[], status: ShopStatus): Promise<BulkResult> {
  try {
    if (!STATUSES.includes(status)) return { ok: false, error: "Unknown status" };
    const clean = ids.filter((id) => /^[0-9a-f-]{36}$/i.test(id)).slice(0, 200);
    const { db } = await requireAdmin();
    const { changed, skipped } = await setShopsStatus(db, clean, status);
    expireShops([...changed, ...skipped]);
    return { ok: true, changed: changed.length, skipped };
  } catch (err) {
    if (err instanceof NotAdminError) return { ok: false, error: "Admins only" };
    console.error("[admin] bulk status", err);
    return { ok: false, error: "Couldn't update shops. Try again." };
  }
}
