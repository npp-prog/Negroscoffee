import { describe, expect, it } from "vitest";

import {
  checkImage,
  claimSchema,
  correctionSchema,
  fieldErrors,
  parseLocationInput,
  suggestShopSchema,
} from "@/lib/validation";

describe("parseLocationInput", () => {
  it("reads coordinates from common map links and plain text", () => {
    expect(parseLocationInput("10.6765, 122.9509")).toEqual({ lat: 10.6765, lng: 122.9509 });
    expect(parseLocationInput("https://www.google.com/maps/@10.6765,122.9509,17z")).toEqual({
      lat: 10.6765,
      lng: 122.9509,
    });
    expect(parseLocationInput("https://maps.google.com/?q=9.3068,123.3054")).toEqual({
      lat: 9.3068,
      lng: 123.3054,
    });
    expect(
      parseLocationInput("https://www.google.com/maps/place/X/data=!3d10.68!4d122.95"),
    ).toEqual({ lat: 10.68, lng: 122.95 });
  });

  it("rejects places far from Negros and short links without coordinates", () => {
    expect(parseLocationInput("14.5995, 120.9842")).toBeNull(); // Manila
    expect(parseLocationInput("https://maps.app.goo.gl/abc123")).toBeNull();
  });
});

describe("suggestShopSchema", () => {
  it("needs only a name and normalizes empty strings", () => {
    const r = suggestShopSchema.parse({
      name: "  Kape Uno ",
      type: "",
      lattePrice: "",
      citySlug: "",
      notes: "",
    });
    expect(r).toMatchObject({
      name: "Kape Uno",
      type: undefined,
      lattePrice: undefined,
      citySlug: undefined,
      notes: undefined,
    });
  });

  it("validates price, links, location, email and the honeypot", () => {
    const r = suggestShopSchema.safeParse({
      name: "X",
      lattePrice: "5",
      facebook: "not a link",
      location: "14.5, 120.9",
      submitterEmail: "nope",
      website_hp: "bot",
    });
    expect(r.success).toBe(false);
    const errs = fieldErrors(r.error!);
    expect(Object.keys(errs).sort()).toEqual([
      "facebook",
      "lattePrice",
      "location",
      "name",
      "submitterEmail",
      "website_hp",
    ]);
  });

  it("coerces and rounds the latte price", () => {
    expect(suggestShopSchema.parse({ name: "Kape", lattePrice: "149.6" }).lattePrice).toBe(150);
  });
});

describe("correctionSchema", () => {
  it("requires at least one change", () => {
    expect(correctionSchema.safeParse({ shopSlug: "kape-uno" }).success).toBe(false);
    expect(
      correctionSchema.parse({ shopSlug: "kape-uno", permanentlyClosed: "on" }).permanentlyClosed,
    ).toBe(true);
    expect(correctionSchema.safeParse({ shopSlug: "../etc", details: "x" }).success).toBe(false);
  });
});

describe("claimSchema", () => {
  const ok = {
    shopSlug: "kape-uno",
    submitterName: "Maria Santos",
    submitterEmail: "maria@example.com",
    role: "owner",
    consent: "on",
  };
  it("accepts a complete claim", () => {
    expect(claimSchema.safeParse(ok).success).toBe(true);
  });
  it("requires consent, a role and a valid phone if given", () => {
    const r = claimSchema.safeParse({ ...ok, consent: undefined, role: "boss", phone: "abc" });
    expect(Object.keys(fieldErrors(r.error!)).sort()).toEqual(["consent", "phone", "role"]);
  });
});

describe("checkImage", () => {
  it("checks presence, type and size", () => {
    expect(checkImage(null, true)).toBe("Add a photo");
    expect(checkImage(null, false)).toBeNull();
    expect(checkImage({ size: 1000, type: "application/pdf" }, true)).toMatch(/JPG/);
    expect(checkImage({ size: 4 * 1024 * 1024, type: "image/jpeg" }, true)).toMatch(/too large/);
    expect(checkImage({ size: 1000, type: "image/webp" }, true)).toBeNull();
  });
});
