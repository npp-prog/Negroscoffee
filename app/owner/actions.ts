"use server";

import { expireShops, NotAdminError, requireShopEditor } from "@/lib/admin-server";
import { getAdminShop, logShopEdit, replaceMenu, updateOwnedShop } from "@/lib/db";
import type { FormState } from "@/lib/forms";
import { fieldErrors, ownerShopSchema } from "@/lib/validation";

function values(form: FormData) {
  const out: Record<string, string> = {};
  for (const [k, v] of form) if (typeof v === "string") out[k] = v;
  return out;
}

const sameMenu = (
  a: { name: string; price: number; category: string | null }[],
  b: { name: string; price: number; category: string | null }[],
) =>
  a.length === b.length &&
  a.every(
    (x, i) =>
      x.name === b[i].name &&
      Number(x.price) === Number(b[i].price) &&
      (x.category ?? null) === (b[i].category ?? null),
  );

/** Owner saves the everyday details of their own shop. */
export async function saveOwnerShopAction(_prev: FormState, form: FormData): Promise<FormState> {
  const vals = values(form);
  const id = vals.id ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { status: "error", errors: { form: "Shop not found." } };
  const parsed = ownerShopSchema.safeParse(vals);
  if (!parsed.success) return { status: "error", values: vals, errors: fieldErrors(parsed.error) };
  const d = parsed.data;

  try {
    const { db, userId, isAdmin } = await requireShopEditor(id);
    const before = await getAdminShop(db, id);
    if (!before) return { status: "error", errors: { form: "Shop not found." } };

    const saved = await updateOwnedShop(db, id, {
      description: d.description,
      lattePrice: d.lattePrice,
      hours: d.hours,
      phone: d.phone,
      website: d.website,
      facebookUrl: d.facebookUrl,
      instagramUrl: d.instagramUrl,
    });
    const oldMenu = before.menu.map((m) => ({
      name: m.name,
      price: Number(m.price),
      category: m.category,
    }));
    if (!sameMenu(oldMenu, d.menu)) {
      await replaceMenu(db, id, d.menu);
      if (!isAdmin) await logShopEdit(db, id, userId, { menu: d.menu.length });
    }
    expireShops([saved.slug]);
    return { status: "success" };
  } catch (err) {
    if (err instanceof NotAdminError) {
      return {
        status: "error",
        values: vals,
        errors: { form: "Only this shop's verified owner can edit it." },
      };
    }
    console.error("[owner] save", err);
    return {
      status: "error",
      values: vals,
      errors: { form: "Couldn't save. Check the fields and try again." },
    };
  }
}
