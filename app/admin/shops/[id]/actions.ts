"use server";

import { redirect } from "next/navigation";

import { expireShops, NotAdminError, requireAdmin, requireShopEditor } from "@/lib/admin-server";
import {
  addShopPhoto,
  createClaimInvite,
  createShop,
  deleteShop,
  deleteShopPhoto,
  getAdminShop,
  getOwnerEmail,
  linkOwnerByEmail,
  logShopEdit,
  reorderShopPhotos,
  replaceMenu,
  revokeClaimInvites,
  slugTaken,
  updateShop,
  unlinkOwner,
  type ShopEdit,
} from "@/lib/db";
import type { FormState } from "@/lib/forms";
import { newInviteToken } from "@/lib/invite-token";
import { siteUrl } from "@/lib/site";
import { adminShopSchema, fieldErrors } from "@/lib/validation";

const UUID = /^[0-9a-f-]{36}$/i;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
// Server Actions accept 4 MB bodies (Vercel ~4.5 MB); photos are shrunk in the browser first.
const PHOTO_MAX = 3.5 * 1024 * 1024;

function values(form: FormData) {
  const out: Record<string, string> = {};
  for (const [k, v] of form) if (typeof v === "string") out[k] = v;
  return out;
}

function fail(err: unknown, vals?: Record<string, string>): FormState {
  if (err instanceof NotAdminError)
    return { status: "error", values: vals, errors: { form: "Admins only." } };
  console.error("[admin]", err);
  const msg =
    err instanceof Error &&
    /violates check constraint "shops_published_is_categorized"/.test(err.message)
      ? "To publish, set a type, a price tier (or latte price) and a province."
      : "Couldn't save. Check the fields and try again.";
  return { status: "error", values: vals, errors: { form: msg } };
}

/** Create (id = "new") or update a shop with its menu. */
export async function saveShopAction(_prev: FormState, form: FormData): Promise<FormState> {
  const vals = values(form);
  const id = vals.id;
  const parsed = adminShopSchema.safeParse(vals);
  if (!parsed.success) return { status: "error", values: vals, errors: fieldErrors(parsed.error) };
  const d = parsed.data;

  let createdId: string | null = null;
  try {
    const { db } = await requireAdmin();
    const existing = id && id !== "new" && UUID.test(id) ? await getAdminShop(db, id) : null;
    if (id !== "new" && !existing) return { status: "error", errors: { form: "Shop not found." } };
    if (await slugTaken(db, d.slug, existing?.id)) {
      return {
        status: "error",
        values: vals,
        errors: { slug: "Another shop already uses this slug." },
      };
    }
    if (d.status === "published" && !(d.type && (d.priceTier || d.lattePrice) && d.province)) {
      return {
        status: "error",
        values: vals,
        errors: { status: "To publish, set a type, a price tier (or latte price) and a province." },
      };
    }

    const edit: ShopEdit = {
      name: d.name,
      slug: d.slug,
      type: d.type,
      lattePrice: d.lattePrice,
      priceTier: d.priceTier,
      description: d.description,
      address: d.address,
      cityId: d.cityId,
      province: d.province,
      lat: d.lat,
      lng: d.lng,
      hours: d.hours,
      phone: d.phone,
      facebookUrl: d.facebookUrl,
      instagramUrl: d.instagramUrl,
      website: d.website,
      googlePlaceId: d.googlePlaceId,
      status: d.status,
      verified: d.verified,
    };

    const saved = existing
      ? await updateShop(db, existing.id, edit, existing.verifiedAt)
      : await createShop(db, edit);
    await replaceMenu(db, saved.id, d.menu);
    expireShops([saved.slug, ...(existing && existing.slug !== saved.slug ? [existing.slug] : [])]);
    if (!existing) createdId = saved.id;
    else return { status: "success" };
  } catch (err) {
    return fail(err, vals);
  }
  redirect(`/admin/shops/${createdId}?created=1`);
}

export async function deleteShopAction(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!UUID.test(id)) return { ok: false, error: "Bad id" };
    const { db } = await requireAdmin();
    const shop = await getAdminShop(db, id);
    if (!shop) return { ok: false, error: "Shop not found" };
    await deleteShop(db, id);
    expireShops([shop.slug]);
  } catch (err) {
    return { ok: false, error: fail(err).errors?.form };
  }
  redirect("/admin/shops");
}

type PhotoResult = { ok: true; added?: number } | { ok: false; error: string };

export async function uploadPhotosAction(shopId: string, form: FormData): Promise<PhotoResult> {
  try {
    if (!UUID.test(shopId)) return { ok: false, error: "Bad id" };
    const files = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
    if (!files.length) return { ok: false, error: "Choose at least one photo." };
    const bad = files.find((f) => !PHOTO_TYPES.includes(f.type) || f.size > PHOTO_MAX);
    if (bad)
      return { ok: false, error: `${bad.name}: use a JPG, PNG, WebP or AVIF photo under 3.5 MB.` };
    const { db, userId, isAdmin } = await requireShopEditor(shopId);
    const shop = await getAdminShop(db, shopId);
    if (!shop) return { ok: false, error: "Shop not found" };
    for (const f of files.slice(0, 10)) await addShopPhoto(db, shopId, f);
    if (!isAdmin) await logShopEdit(db, shopId, userId, { photos: "added" });
    expireShops([shop.slug]);
    return { ok: true, added: Math.min(files.length, 10) };
  } catch (err) {
    return { ok: false, error: fail(err).errors?.form ?? "Upload failed" };
  }
}

export async function deletePhotoAction(shopId: string, photoId: string): Promise<PhotoResult> {
  try {
    if (!UUID.test(shopId) || !UUID.test(photoId)) return { ok: false, error: "Bad id" };
    const { db, userId, isAdmin } = await requireShopEditor(shopId);
    const shop = await getAdminShop(db, shopId);
    if (!shop?.photos.some((p) => p.id === photoId)) return { ok: false, error: "Photo not found" };
    await deleteShopPhoto(db, photoId);
    if (!isAdmin) await logShopEdit(db, shopId, userId, { photos: "deleted" });
    expireShops([shop.slug]);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: fail(err).errors?.form ?? "Delete failed" };
  }
}

export async function reorderPhotosAction(
  shopId: string,
  orderedIds: string[],
): Promise<PhotoResult> {
  try {
    if (!UUID.test(shopId) || !orderedIds.every((x) => UUID.test(x)))
      return { ok: false, error: "Bad id" };
    const { db, userId, isAdmin } = await requireShopEditor(shopId);
    const shop = await getAdminShop(db, shopId);
    if (!shop) return { ok: false, error: "Shop not found" };
    await reorderShopPhotos(db, shopId, orderedIds);
    if (!isAdmin) await logShopEdit(db, shopId, userId, { photos: "reordered" });
    expireShops([shop.slug]);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: fail(err).errors?.form ?? "Reorder failed" };
  }
}

export type LinkResult = { ok: true; email: string | null } | { ok: false; error: string };

export async function linkOwnerAction(shopId: string, email: string): Promise<LinkResult> {
  try {
    if (!UUID.test(shopId)) return { ok: false, error: "Bad id" };
    const clean = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean))
      return { ok: false, error: "Enter a valid email" };
    const { db } = await requireAdmin();
    await linkOwnerByEmail(db, shopId, clean);
    const shop = await getAdminShop(db, shopId);
    if (shop) expireShops([shop.slug]);
    return { ok: true, email: await getOwnerEmail(db, shopId) };
  } catch (err) {
    if (err instanceof NotAdminError) return { ok: false, error: "Admins only" };
    const msg = err instanceof Error ? err.message : "";
    if (/no account/.test(msg)) {
      return {
        ok: false,
        error:
          "No account with that email yet. Ask the owner to sign in once at /login, then try again.",
      };
    }
    console.error("[admin] link owner", err);
    return { ok: false, error: "Couldn't link the owner. Try again." };
  }
}

export async function unlinkOwnerAction(shopId: string): Promise<LinkResult> {
  try {
    if (!UUID.test(shopId)) return { ok: false, error: "Bad id" };
    const { db } = await requireAdmin();
    await unlinkOwner(db, shopId);
    return { ok: true, email: null };
  } catch (err) {
    if (err instanceof NotAdminError) return { ok: false, error: "Admins only" };
    console.error("[admin] unlink owner", err);
    return { ok: false, error: "Couldn't remove the owner. Try again." };
  }
}

// --- claim invites ----------------------------------------------------------------------------

type InviteResult = { ok: true; url: string; expiresAt: string } | { ok: false; error: string };

/** Create a one-time owner invite link (replaces any open one). The token is shown only now. */
export async function createInviteAction(shopId: string): Promise<InviteResult> {
  try {
    if (!UUID.test(shopId)) return { ok: false, error: "Bad id" };
    const { db } = await requireAdmin();
    const { token, hash } = newInviteToken();
    const invite = await createClaimInvite(db, shopId, hash);
    return { ok: true, url: `${siteUrl()}/invite/${token}`, expiresAt: invite.expiresAt };
  } catch (err) {
    if (err instanceof NotAdminError) return { ok: false, error: "Admins only" };
    console.error("[admin] create invite", err);
    return { ok: false, error: "Couldn't create the invite. Try again." };
  }
}

export async function revokeInviteAction(shopId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!UUID.test(shopId)) return { ok: false, error: "Bad id" };
    const { db } = await requireAdmin();
    await revokeClaimInvites(db, shopId);
    return { ok: true };
  } catch (err) {
    if (err instanceof NotAdminError) return { ok: false, error: "Admins only" };
    console.error("[admin] revoke invite", err);
    return { ok: false, error: "Couldn't cancel the invite." };
  }
}
