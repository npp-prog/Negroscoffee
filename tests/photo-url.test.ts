import { describe, expect, it } from "vitest";

import { shopPhotoUrl } from "@/lib/db/shops";

describe("shopPhotoUrl", () => {
  const base = "https://abc.supabase.co/";
  it("uses the original file unless transforms are on", () => {
    expect(shopPhotoUrl(base, "s/a b.jpg", { width: 400 }, false)).toBe(
      "https://abc.supabase.co/storage/v1/object/public/shop-photos/s/a%20b.jpg",
    );
  });
  it("uses the render endpoint when transforms are on", () => {
    expect(shopPhotoUrl(base, "s/a.jpg", { width: 400, height: 300 }, true)).toBe(
      "https://abc.supabase.co/storage/v1/render/image/public/shop-photos/s/a.jpg?resize=cover&width=400&height=300",
    );
  });
});
