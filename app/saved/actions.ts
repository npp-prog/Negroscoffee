"use server";

import { getViewer } from "@/lib/admin-server";
import { updateMyDisplayName } from "@/lib/db";

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
