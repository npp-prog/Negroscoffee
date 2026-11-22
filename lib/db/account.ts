/**
 * Self-service account deletion. Needs a service-role client (deleting an auth user is an admin
 * API). Database cascades (see supabase/tests/06_account_deletion.test.sql) remove the profile,
 * reviews, lists and photo queue, release claimed shops and anonymize approved photos.
 * Framework-free.
 */
import { unwrap, type Db } from "./client";

/** Delete a user and their data. Returns slugs of shops whose public pages change. */
export async function deleteAccount(admin: Db, userId: string): Promise<string[]> {
  const [reviewed, claimed, photos] = await Promise.all([
    admin.from("reviews").select("shops(slug)").eq("user_id", userId),
    admin.from("shops").select("slug").eq("claimed_by", userId),
    admin.from("shop_photos").select("shops(slug)").eq("contributed_by", userId),
  ]);
  const slugOf = (r: { shops: unknown }) => (r.shops as { slug: string } | null)?.slug;
  const slugs = new Set<string>(
    [
      ...unwrap(reviewed).map(slugOf),
      ...unwrap(claimed).map((r) => r.slug),
      ...unwrap(photos).map(slugOf),
    ].filter((s): s is string => !!s),
  );

  // Private files waiting for review.
  const listed = await admin.storage.from("photo-submissions").list(userId, { limit: 1000 });
  const files = (listed.data ?? []).map((f) => `${userId}/${f.name}`);
  if (files.length) await admin.storage.from("photo-submissions").remove(files);

  // Approved photos stay on the shop, without the name.
  unwrap(
    await admin
      .from("shop_photos")
      .update({ credit: null })
      .eq("contributed_by", userId)
      .select("id"),
  );

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);
  return [...slugs];
}
