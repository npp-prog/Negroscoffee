"use server";

import { redirect } from "next/navigation";

import { expireShops, getViewer } from "@/lib/admin-server";
import {
  deleteAccount,
  deleteMyPendingPhoto,
  updateMyDisplayName,
  updateMyNotifyEmail,
} from "@/lib/db";
import { getAdminSupabase } from "@/lib/supabase/admin";

export async function updateDisplayNameAction(
  name: string,
): Promise<{ ok: boolean; error?: string }> {
  const clean = name.trim().replace(/\s+/g, " ").slice(0, 60);
  if (clean.length === 1) return { ok: false, error: "Use at least 2 characters." };
  try {
    const { db, user } = await getViewer();
    if (!user) return { ok: false, error: "Not signed in." };
    await updateMyDisplayName(db, user.id, clean || null);
    return { ok: true };
  } catch (err) {
    console.error("[saved] display name", err);
    return { ok: false, error: "Couldn't save your name. Try again." };
  }
}

export async function updateNotifyEmailAction(
  on: boolean,
): Promise<{ ok: boolean; error?: string }> {
  if (typeof on !== "boolean") return { ok: false, error: "Bad request" };
  try {
    const { db, user } = await getViewer();
    if (!user) return { ok: false, error: "Not signed in." };
    await updateMyNotifyEmail(db, user.id, on);
    return { ok: true };
  } catch (err) {
    console.error("[saved] notify email", err);
    return { ok: false, error: "Couldn't save. Try again." };
  }
}

export async function withdrawPhotoAction(id: string): Promise<{ ok: boolean; error?: string }> {
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/.test(id))
    return { ok: false, error: "Bad request" };
  try {
    const { db, user } = await getViewer();
    if (!user) return { ok: false, error: "Not signed in." };
    await deleteMyPendingPhoto(db, id);
    return { ok: true };
  } catch (err) {
    console.error("[saved] withdraw photo", err);
    return { ok: false, error: "Couldn't withdraw. Try again." };
  }
}

/** Permanently delete the signed-in account. `confirm` must be "DELETE". */
export async function deleteAccountAction(confirm: string): Promise<{ ok: false; error: string }> {
  if (confirm !== "DELETE") return { ok: false, error: "Type DELETE to confirm." };
  try {
    const { db, user, role } = await getViewer();
    if (!user) return { ok: false, error: "Not signed in." };
    if (role === "admin")
      return {
        ok: false,
        error: "Admin accounts can't be deleted here. Remove the admin role first.",
      };
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
      return { ok: false, error: "Account deletion isn't set up yet. Please contact us." };
    const slugs = await deleteAccount(getAdminSupabase(), user.id);
    if (slugs.length) expireShops(slugs);
    await db.auth.signOut().catch(() => {});
  } catch (err) {
    console.error("[saved] delete account", err);
    return { ok: false, error: "Couldn't delete your account. Try again." };
  }
  redirect("/?deleted=1");
}
