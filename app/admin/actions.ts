"use server";

import { expireShops, NotAdminError, requireAdmin } from "@/lib/admin-server";
import { deleteDemoShops } from "@/lib/db";

export async function removeDemoShopsAction(): Promise<{
  ok: boolean;
  removed?: number;
  error?: string;
}> {
  try {
    const { db } = await requireAdmin();
    const slugs = await deleteDemoShops(db);
    expireShops(slugs);
    return { ok: true, removed: slugs.length };
  } catch (err) {
    if (err instanceof NotAdminError) return { ok: false, error: "Admins only" };
    console.error("[admin] remove demo shops", err);
    return { ok: false, error: "Couldn't remove the demo shops." };
  }
}
