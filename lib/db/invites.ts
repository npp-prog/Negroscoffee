/**
 * Claim invites (migration 20261122000009): admins create one-time links; owners accept them.
 * Tokens are generated and hashed by the caller (SHA-256 hex); only the hash is stored.
 * Framework-free.
 */
import { unwrap, type Db } from "./client";

export const INVITE_DAYS = 14;

export type InviteStatus = "valid" | "used" | "expired" | "revoked" | "owned";
export type InviteInfo = {
  shopId: string;
  shopName: string;
  shopSlug: string;
  status: InviteStatus;
};
export type ActiveInvite = { createdAt: string; expiresAt: string };

/** Revoke a shop's open invites and create a new one. */
export async function createClaimInvite(
  db: Db,
  shopId: string,
  tokenHash: string,
): Promise<ActiveInvite> {
  await revokeClaimInvites(db, shopId);
  const expiresAt = new Date(Date.now() + INVITE_DAYS * 86_400_000).toISOString();
  const row = unwrap<{ created_at: string; expires_at: string }>(
    await db
      .from("shop_claim_invites")
      .insert({ shop_id: shopId, token_hash: tokenHash, expires_at: expiresAt })
      .select("created_at, expires_at")
      .single(),
  );
  return { createdAt: row.created_at, expiresAt: row.expires_at };
}

export async function revokeClaimInvites(db: Db, shopId: string): Promise<void> {
  unwrap(
    await db
      .from("shop_claim_invites")
      .update({ revoked_at: new Date().toISOString() })
      .eq("shop_id", shopId)
      .is("used_at", null)
      .is("revoked_at", null)
      .select("id"),
  );
}

/** The shop's newest open, unexpired invite (admins only). */
export async function getActiveClaimInvite(db: Db, shopId: string): Promise<ActiveInvite | null> {
  const rows = unwrap<{ created_at: string; expires_at: string }[]>(
    await db
      .from("shop_claim_invites")
      .select("created_at, expires_at")
      .eq("shop_id", shopId)
      .is("used_at", null)
      .is("revoked_at", null)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1),
  );
  return rows[0] ? { createdAt: rows[0].created_at, expiresAt: rows[0].expires_at } : null;
}

export async function getClaimInviteInfo(db: Db, token: string): Promise<InviteInfo | null> {
  const { data, error } = await db.rpc("claim_invite_info", { p_token: token });
  if (error) throw new Error(error.message);
  const row = data?.[0];
  return row
    ? {
        shopId: row.shop_id,
        shopName: row.shop_name,
        shopSlug: row.shop_slug,
        status: row.status as InviteStatus,
      }
    : null;
}

/** Accept as the signed-in user; returns the shop id. Errors contain invite_invalid / invite_owned. */
export async function acceptClaimInvite(db: Db, token: string): Promise<string> {
  const { data, error } = await db.rpc("accept_claim_invite", { p_token: token });
  if (error) throw new Error(error.message);
  return data;
}
