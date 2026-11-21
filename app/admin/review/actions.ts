"use server";

import { expireShops, NotAdminError, requireAdmin } from "@/lib/admin-server";
import { SHOP_TYPES, type PriceTier, type ShopType } from "@/lib/categories";
import { quickReviewShop } from "@/lib/db";

export type QuickResult = { ok: true } | { ok: false; error: string };

export async function quickReviewAction(
  id: string,
  input: {
    status: "published" | "hidden";
    type: ShopType | null;
    lattePrice: string;
    priceTier: string;
  },
): Promise<QuickResult> {
  try {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, error: "Bad id" };
    if (input.status !== "published" && input.status !== "hidden")
      return { ok: false, error: "Bad status" };
    const type = input.type && SHOP_TYPES.includes(input.type) ? input.type : null;
    const priceText = input.lattePrice.trim();
    const latte = priceText === "" ? null : Number(priceText);
    if (latte != null && (!Number.isFinite(latte) || latte < 10 || latte > 2000)) {
      return { ok: false, error: "Latte price should be between ₱10 and ₱2,000" };
    }
    const tier = ["1", "2", "3", "4"].includes(input.priceTier)
      ? (Number(input.priceTier) as PriceTier)
      : null;

    const { db } = await requireAdmin();
    const res = await quickReviewShop(db, id, {
      status: input.status,
      type,
      lattePrice: latte == null ? null : Math.round(latte),
      priceTier: tier,
    });
    if (!res.ok) return { ok: false, error: res.reason };
    expireShops([res.slug]);
    return { ok: true };
  } catch (err) {
    if (err instanceof NotAdminError) return { ok: false, error: "Admins only" };
    console.error("[admin] quick review", err);
    return { ok: false, error: "Couldn't save. Try again." };
  }
}
