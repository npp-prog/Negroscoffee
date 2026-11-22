import "server-only";

import {
  claimDecisionEmail,
  newReviewEmail,
  newSubmissionEmail,
  type SubmissionKindLabel,
} from "@/lib/email/templates";
import { emailEnabled, sendEmail } from "@/lib/email/send";
import { siteUrl } from "@/lib/site";
import { getAdminSupabase } from "@/lib/supabase/admin";

/*
 * Notification emails. Run inside `after()` so they never slow down or break the user's action.
 * Recipients are looked up with the service-role client (server-only): owner/admin emails are
 * never exposed to visitors. Everything is skipped when email or the service key isn't set up.
 */

type Admin = ReturnType<typeof getAdminSupabase>;

function ready(): Admin | null {
  if (!emailEnabled() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  try {
    return getAdminSupabase();
  } catch {
    return null;
  }
}

async function emailOf(db: Admin, userId: string): Promise<string | null> {
  const { data, error } = await db.auth.admin.getUserById(userId);
  return error ? null : (data.user?.email ?? null);
}

async function wantsEmail(db: Admin, userId: string): Promise<boolean> {
  const { data } = await db.from("profiles").select("notify_email").eq("id", userId).maybeSingle();
  return data?.notify_email !== false;
}

/** NOTIFY_ADMIN_EMAILS (comma-separated) wins; otherwise admin accounts that kept emails on. */
async function adminRecipients(db: Admin): Promise<string[]> {
  const fixed = (process.env.NOTIFY_ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (fixed.length) return fixed;
  const { data } = await db
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .eq("notify_email", true);
  const emails = await Promise.all((data ?? []).map((p) => emailOf(db, p.id)));
  return emails.filter((e): e is string => !!e);
}

function log(what: string, err: unknown) {
  console.error(`[notify] ${what} failed:`, err instanceof Error ? err.message : err);
}

/** A new review was posted: tell the shop's verified owner. */
export async function notifyNewReview(p: { shopId: string; userId: string }) {
  const db = ready();
  if (!db) return;
  try {
    const { data: review } = await db
      .from("reviews")
      .select("rating, body, author_name, status")
      .eq("shop_id", p.shopId)
      .eq("user_id", p.userId)
      .maybeSingle();
    if (!review || review.status !== "visible") return;
    const { data: shop } = await db
      .from("shops")
      .select("id, name, claimed_by")
      .eq("id", p.shopId)
      .maybeSingle();
    if (!shop?.claimed_by || !(await wantsEmail(db, shop.claimed_by))) return;
    const to = await emailOf(db, shop.claimed_by);
    if (!to) return;
    const base = siteUrl();
    await sendEmail({
      to: [to],
      ...newReviewEmail({
        shopName: shop.name,
        rating: review.rating,
        body: review.body,
        authorName: review.author_name,
        ownerUrl: `${base}/owner/shops/${shop.id}`,
        settingsUrl: `${base}/saved`,
      }),
    });
  } catch (err) {
    log("new review", err);
  }
}

/** A visitor sent a suggestion, edit or claim: tell the admins. */
export async function notifyNewSubmission(p: {
  kind: SubmissionKindLabel;
  /** New-shop name; for claims and edits pass shopSlug and the name is looked up. */
  title?: string;
  shopSlug?: string;
  from: string | null;
}) {
  const db = ready();
  if (!db) return;
  try {
    let title = p.title ?? "";
    if (!title && p.shopSlug) {
      const { data } = await db.from("shops").select("name").eq("slug", p.shopSlug).maybeSingle();
      title = data?.name ?? p.shopSlug;
    }
    const to = await adminRecipients(db);
    if (!to.length) return;
    const base = siteUrl();
    await sendEmail({
      to,
      ...newSubmissionEmail({
        kind: p.kind,
        title: title || "Untitled",
        from: p.from,
        reviewUrl:
          p.kind === "photo" ? `${base}/admin/photos` : `${base}/admin/submissions?kind=${p.kind}`,
        settingsUrl: `${base}/saved`,
      }),
    });
  } catch (err) {
    log("new submission", err);
  }
}

/** An admin decided a claim: tell the claimant (always; it answers their own request). */
export async function notifyClaimDecision(submissionId: string) {
  const db = ready();
  if (!db) return;
  try {
    const { data: sub } = await db
      .from("submissions")
      .select(
        "kind, status, notes, submitter_id, submitter_email, shops(id, slug, name, claimed_by)",
      )
      .eq("id", submissionId)
      .maybeSingle();
    const shop = sub?.shops as {
      id: string;
      slug: string;
      name: string;
      claimed_by: string | null;
    } | null;
    if (!sub || sub.kind !== "claim" || sub.status === "pending" || !shop) return;
    const to =
      sub.submitter_email ?? (sub.submitter_id ? await emailOf(db, sub.submitter_id) : null);
    if (!to) return;
    const base = siteUrl();
    await sendEmail({
      to: [to],
      ...claimDecisionEmail({
        shopName: shop.name,
        approved: sub.status === "approved",
        linkedAccount: !!sub.submitter_id && shop.claimed_by === sub.submitter_id,
        notes: sub.notes,
        ownerUrl: `${base}/owner`,
        loginUrl: `${base}/login?next=/owner`,
        shopUrl: `${base}/shop/${shop.slug}`,
      }),
    });
  } catch (err) {
    log("claim decision", err);
  }
}
