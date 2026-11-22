"use server";

import { redirect } from "next/navigation";

import { expireShops, getViewer } from "@/lib/admin-server";
import { acceptClaimInvite, getClaimInviteInfo } from "@/lib/db";

export async function acceptInviteAction(token: string): Promise<{ ok: false; error: string }> {
  if (typeof token !== "string" || token.length < 20 || token.length > 100)
    return { ok: false, error: "This invite link isn't valid." };
  let shopId: string;
  try {
    const { db, user } = await getViewer();
    if (!user) return { ok: false, error: "Sign in first." };
    const info = await getClaimInviteInfo(db, token);
    shopId = await acceptClaimInvite(db, token);
    if (info) expireShops([info.shopSlug]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("invite_owned"))
      return { ok: false, error: "This shop already has an owner." };
    if (msg.includes("invite_invalid"))
      return { ok: false, error: "This invite link has expired or was already used." };
    console.error("[invite] accept", err);
    return { ok: false, error: "Couldn't accept the invite. Try again." };
  }
  redirect(`/owner/shops/${shopId}?welcome=1`);
}
