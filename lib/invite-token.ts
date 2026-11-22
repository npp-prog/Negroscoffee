import "server-only";

import { createHash, randomBytes } from "node:crypto";

/** A new random invite token (URL-safe) and the SHA-256 hex hash the database stores. */
export function newInviteToken(): { token: string; hash: string } {
  const token = randomBytes(24).toString("base64url");
  return { token, hash: createHash("sha256").update(token, "utf8").digest("hex") };
}
