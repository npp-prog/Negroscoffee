import { describe, expect, it } from "vitest";

import { isNewShop } from "@/lib/new";

const now = new Date("2026-11-22T10:00:00Z");

describe("isNewShop", () => {
  it("is new within 14 days of publishing", () => {
    expect(isNewShop("2026-11-21T10:00:00Z", now)).toBe(true);
    expect(isNewShop("2026-11-08T10:00:00Z", now)).toBe(true);
    expect(isNewShop("2026-11-07T09:00:00Z", now)).toBe(false);
  });
  it("handles missing, invalid and future dates", () => {
    expect(isNewShop(null, now)).toBe(false);
    expect(isNewShop("not a date", now)).toBe(false);
    expect(isNewShop("2026-11-22T10:00:30Z", now)).toBe(true); // clock skew
    expect(isNewShop("2026-12-01T00:00:00Z", now)).toBe(false);
  });
});
