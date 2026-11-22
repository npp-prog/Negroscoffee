import "server-only";

import { updateTag } from "next/cache";

import { shopTag } from "@/app/shop/[slug]/data";
import { getProfileRole, ownsShop, type Db } from "@/lib/db";
import { listTag } from "@/lib/lists";
import { getServerSupabase } from "@/lib/supabase/server";

export type AdminContext = { db: Db; userId: string; email: string | null };

/** The signed-in user and their role, or null when signed out. */
export async function getViewer() {
  const db = await getServerSupabase();
  const { data } = await db.auth.getUser();
  if (!data.user) return { db, user: null, role: null } as const;
  const profile = await getProfileRole(db, data.user.id);
  return { db, user: data.user, role: profile?.role ?? "user" } as const;
}

export class NotAdminError extends Error {
  constructor() {
    super("Admins only");
  }
}

/**
 * Every admin Server Action starts here: actions are public endpoints, so the page guard
 * alone is not enough. RLS would also refuse the writes; this gives a clear error first.
 */
export async function requireAdmin(): Promise<AdminContext> {
  const { db, user, role } = await getViewer();
  if (!user || role !== "admin") throw new NotAdminError();
  return { db, userId: user.id, email: user.email ?? null };
}

/** Expire cached public pages for these shops and the slug list (call from Server Actions). */
/** Refresh public list pages (and shop pages, which show "Featured in"). */
export function expireLists(slugs: string[]) {
  updateTag("lists");
  for (const slug of new Set(slugs)) updateTag(listTag(slug));
}

export function expireShops(slugs: string[]) {
  updateTag("shops");
  for (const slug of new Set(slugs)) updateTag(shopTag(slug));
}

/**
 * Server Actions that edit one shop start here: admins may edit any shop, verified owners only
 * their own (RLS and the guard trigger enforce the same in the database).
 */
export async function requireShopEditor(
  shopId: string,
): Promise<AdminContext & { isAdmin: boolean }> {
  const { db, user, role } = await getViewer();
  if (!user) throw new NotAdminError();
  if (role === "admin") return { db, userId: user.id, email: user.email ?? null, isAdmin: true };
  if (role === "owner" && (await ownsShop(db, shopId))) {
    return { db, userId: user.id, email: user.email ?? null, isAdmin: false };
  }
  throw new NotAdminError();
}
