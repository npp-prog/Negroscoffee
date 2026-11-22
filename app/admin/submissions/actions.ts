"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";

import { expireShops, NotAdminError, requireAdmin } from "@/lib/admin-server";
import { approveClaim, createDraftFromSuggestion, getSubmission, reviewSubmission } from "@/lib/db";
import { notifyClaimDecision } from "@/lib/notifications";

export type ReviewResult = { ok: true; message: string } | { ok: false; error: string };

const DECISIONS = ["approve", "reject"] as const;

export async function reviewAction(
  id: string,
  decision: (typeof DECISIONS)[number],
  notes: string,
): Promise<ReviewResult> {
  let goTo: string | null = null;
  try {
    if (!/^[0-9a-f-]{36}$/i.test(id) || !DECISIONS.includes(decision))
      return { ok: false, error: "Bad request" };
    const { db, userId } = await requireAdmin();
    const sub = await getSubmission(db, id);
    if (!sub) return { ok: false, error: "Submission not found" };
    if (sub.status !== "pending") return { ok: false, error: "Already reviewed" };
    const note = notes.trim().slice(0, 1000) || null;

    if (decision === "reject") {
      await reviewSubmission(db, id, "rejected", userId, note);
      if (sub.kind === "claim") after(() => notifyClaimDecision(id));
      return { ok: true, message: "Rejected" };
    }

    const shop = sub.shops as { id: string; slug: string } | null;
    if (sub.kind === "new_shop") {
      const shopId = await createDraftFromSuggestion(
        db,
        (sub.payload ?? {}) as Record<string, unknown>,
      );
      await reviewSubmission(db, id, "approved", userId, note);
      goTo = `/admin/shops/${shopId}?created=1`;
    } else if (sub.kind === "claim") {
      if (!shop) return { ok: false, error: "The shop no longer exists" };
      await approveClaim(db, shop.id, sub.submitter_id);
      await reviewSubmission(db, id, "approved", userId, note);
      after(() => notifyClaimDecision(id));
      expireShops([shop.slug]);
      return {
        ok: true,
        message: sub.submitter_id
          ? "Claim approved: shop verified and linked to the owner's account"
          : "Claim approved: shop verified (claimant had no account to link)",
      };
    } else {
      await reviewSubmission(db, id, "approved", userId, note);
      return { ok: true, message: "Marked as applied" };
    }
  } catch (err) {
    if (err instanceof NotAdminError) return { ok: false, error: "Admins only" };
    console.error("[admin] review", err);
    return { ok: false, error: "Couldn't save the review. Try again." };
  }
  redirect(goTo);
}
