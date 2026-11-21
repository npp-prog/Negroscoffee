import "server-only";

import { updateTag } from "next/cache";

import { shopTag } from "@/app/shop/[slug]/data";
import { getProfileRole, type Db } from "@/lib/db";
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
export function expireShops(slugs: string[]) {
  updateTag("shops");
  for (const slug of new Set(slugs)) updateTag(shopTag(slug));
}
