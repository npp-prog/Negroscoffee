import { describe, expect, it } from "vitest";

import { safeNext } from "@/lib/auth";
import { shopPhotoUrl } from "@/lib/db/shops";
import { adminShopSchema } from "@/lib/validation";

describe("safeNext", () => {
  it("blocks control-character and backslash tricks", () => {
    for (const bad of [
      "/\t/evil.com",
      "/\n/evil.com",
      "/\\evil.com",
      "/\r\n//evil.com",
      "//evil.com",
      "https://evil.com",
    ]) {
      expect(safeNext(bad)).toBe("/admin");
    }
    expect(safeNext("/shop/x?y=1#reviews")).toBe("/shop/x?y=1#reviews");
  });

  it("allows same-site paths and blocks open redirects", () => {
    expect(safeNext("/admin/shops")).toBe("/admin/shops");
    expect(safeNext("https://evil.example")).toBe("/admin");
    expect(safeNext("//evil.example")).toBe("/admin");
    expect(safeNext("/\\evil.example")).toBe("/admin");
    expect(safeNext(null)).toBe("/admin");
  });
});

describe("shopPhotoUrl", () => {
  it("builds public and transformed URLs without a client", () => {
    expect(shopPhotoUrl("https://x.supabase.co/", "abc/1 2.jpg")).toBe(
      "https://x.supabase.co/storage/v1/object/public/shop-photos/abc/1%202.jpg",
    );
    expect(
      shopPhotoUrl("https://x.supabase.co", "abc/1.jpg", { width: 400, height: 300 }, true),
    ).toBe(
      "https://x.supabase.co/storage/v1/render/image/public/shop-photos/abc/1.jpg?resize=cover&width=400&height=300",
    );
  });
});

describe("adminShopSchema", () => {
  const base = { name: "Kape", slug: "kape", status: "draft", lat: "10.67", lng: "122.95" };

  it("normalizes optional fields and parses hours/menu JSON", () => {
    const r = adminShopSchema.parse({
      ...base,
      type: "",
      priceTier: "",
      cityId: "",
      verified: "on",
      hours: JSON.stringify({ mon: [{ open: "07:00", close: "21:00" }], sun: [] }),
      menu: JSON.stringify([{ name: "Latte", price: "150", category: "" }]),
    });
    expect(r).toMatchObject({ type: null, priceTier: null, cityId: null, verified: true });
    expect(r.hours).toEqual({ mon: [{ open: "07:00", close: "21:00" }], sun: [] });
    expect(r.menu).toEqual([{ name: "Latte", price: 150, category: null }]);
  });

  it("rejects bad slugs, off-island pins, bad hours and blank menu prices", () => {
    expect(adminShopSchema.safeParse({ ...base, slug: "Bad Slug" }).success).toBe(false);
    expect(adminShopSchema.safeParse({ ...base, lat: "14.6", lng: "121.0" }).success).toBe(false);
    expect(
      adminShopSchema.safeParse({ ...base, hours: '{"mon":[{"open":"7am","close":"9pm"}]}' })
        .success,
    ).toBe(false);
    expect(
      adminShopSchema.safeParse({ ...base, menu: '[{"name":"Latte","price":""}]' }).success,
    ).toBe(false);
  });
});

describe("describeShopEdit", () => {
  it("summarizes owner edits", async () => {
    const { describeShopEdit } = await import("@/lib/db/owner");
    expect(describeShopEdit({ fields: ["hours", "latte_price"] })).toBe("hours, latte price");
    expect(describeShopEdit({ menu: 1 })).toBe("menu (1 item)");
    expect(describeShopEdit({ photos: "added" })).toBe("photos added");
    expect(describeShopEdit({})).toBe("details");
  });
});

describe("ratingLabel", () => {
  it("formats averages and hides empty ratings", async () => {
    const { ratingLabel } = await import("@/lib/db/reviews");
    expect(ratingLabel(4.6, 12)).toBe("4.6");
    expect(ratingLabel(4, 1)).toBe("4.0");
    expect(ratingLabel(null, 0)).toBeNull();
    expect(ratingLabel(4.5, 0)).toBeNull();
  });
});
