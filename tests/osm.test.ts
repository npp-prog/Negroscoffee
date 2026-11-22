import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  guessType,
  isCoffeePlace,
  matchCity,
  parseOpeningHours,
  slugify,
  toDraft,
  uniqueSlug,
  type CityRef,
  type OverpassElement,
} from "@/lib/osm";

const cities: CityRef[] = [
  { slug: "bacolod", name: "Bacolod", province: "negros_occidental", lat: 10.6765, lng: 122.9509 },
  { slug: "silay", name: "Silay", province: "negros_occidental", lat: 10.7937, lng: 122.9748 },
  { slug: "dumaguete", name: "Dumaguete", province: "negros_oriental", lat: 9.3068, lng: 123.3054 },
];

const fixture: { elements: OverpassElement[] } = JSON.parse(
  readFileSync(new URL("./fixtures/overpass-sample.json", import.meta.url), "utf8"),
);
const el = (id: number) => fixture.elements.find((e) => e.id === id)!;

describe("parseOpeningHours", () => {
  it("parses day ranges and lists", () => {
    const h = parseOpeningHours("Mo-Fr 07:00-19:00; Sa,Su 08:00-17:00")!;
    expect(h.mon).toEqual([{ open: "07:00", close: "19:00" }]);
    expect(h.fri).toEqual([{ open: "07:00", close: "19:00" }]);
    expect(h.sun).toEqual([{ open: "08:00", close: "17:00" }]);
  });

  it("handles split shifts, off days and later-rule overrides", () => {
    const h = parseOpeningHours("Mo-Su 08:00-12:00,13:00-20:00; Tu off")!;
    expect(h.mon).toHaveLength(2);
    expect(h.tue).toEqual([]);
  });

  it("handles 24/7, bare times, wrap-around days and past-midnight closes", () => {
    expect(parseOpeningHours("24/7")!.wed).toEqual([{ open: "00:00", close: "24:00" }]);
    expect(Object.keys(parseOpeningHours("7:00-21:00")!)).toHaveLength(7);
    const wrap = parseOpeningHours("Sa-Mo 09:00-17:00")!;
    expect(wrap.sat).toHaveLength(1);
    expect(wrap.sun).toHaveLength(1);
    expect(wrap.mon).toHaveLength(1);
    expect(wrap.tue).toEqual([]);
    expect(parseOpeningHours("Fr 18:00-26:00")!.fri).toEqual([{ open: "18:00", close: "02:00" }]);
  });

  it("treats days no rule mentions as closed, like OSM", () => {
    const h = parseOpeningHours("Mo-Fr 08:00-17:00")!;
    expect(h.sat).toEqual([]);
    expect(h.sun).toEqual([]);
    expect(Object.keys(h)).toHaveLength(7);
  });

  it("refuses to guess on syntax it doesn't understand", () => {
    expect(parseOpeningHours("Mo-Su 06:00-11:00; PH off")).toBeNull();
    expect(parseOpeningHours("sunrise-sunset")).toBeNull();
    expect(parseOpeningHours("Jan-Mar Mo-Fr 08:00-17:00")).toBeNull();
    expect(parseOpeningHours(undefined)).toBeNull();
  });
});

describe("classification", () => {
  it("marks branded and known chains", () => {
    expect(guessType({ brand: "Starbucks" })).toBe("chain");
    expect(guessType({ name: "Bo's Coffee SM City" })).toBe("chain");
    expect(guessType({ name: "Kape Uno" })).toBeNull();
  });

  it("skips milk tea places but keeps plain cafés", () => {
    expect(isCoffeePlace({ amenity: "cafe", cuisine: "bubble_tea" })).toBe(false);
    expect(isCoffeePlace({ amenity: "cafe", name: "Tea Time Milk Tea" })).toBe(false);
    expect(isCoffeePlace({ amenity: "cafe", cuisine: "coffee_shop;bubble_tea" })).toBe(true);
    expect(isCoffeePlace({ amenity: "cafe", name: "Corner Cafe" })).toBe(true);
  });
});

describe("matchCity", () => {
  it("prefers addr:city, then the nearest town within range", () => {
    expect(
      matchCity({ lat: 10.79, lng: 122.97 }, { "addr:city": "Bacolod City" }, cities)?.slug,
    ).toBe("bacolod");
    expect(matchCity({ lat: 10.79, lng: 122.97 }, {}, cities)?.slug).toBe("silay");
    expect(matchCity({ lat: 9.6, lng: 122.9 }, {}, cities)).toBeNull();
  });
});

describe("toDraft", () => {
  it("maps a full café", () => {
    const r = toDraft(el(1001), cities);
    expect("draft" in r && r.draft).toMatchObject({
      osmId: "node/1001",
      name: "Kape Uno",
      slugBase: "kape-uno-bacolod",
      address: "12 Lacson Street",
      citySlug: "bacolod",
      province: "negros_occidental",
      phone: "+63 34 555 0100",
      instagramUrl: "https://www.instagram.com/kapeuno",
      suggestedType: null,
    });
  });

  it("uses way centers and flags chains", () => {
    const r = toDraft(el(2002), cities);
    expect("draft" in r && r.draft).toMatchObject({
      osmId: "way/2002",
      citySlug: "dumaguete",
      suggestedType: "chain",
    });
  });

  it("skips nameless, non-coffee and off-island elements", () => {
    expect(toDraft(el(1004), cities)).toEqual({ skip: "not-coffee" });
    expect(toDraft(el(1005), cities)).toEqual({ skip: "no-name" });
    expect(toDraft(el(1006), cities)).toEqual({ skip: "outside-negros" });
  });

  it("keeps rural shops without a city and without parseable hours", () => {
    const r = toDraft(el(1008), cities);
    expect("draft" in r && r.draft.citySlug).toBeNull();
    const r2 = toDraft(el(1007), cities);
    expect("draft" in r2 && r2.draft.hours).toBeNull();
  });
});

describe("slugs", () => {
  it("slugifies names", () => {
    expect(slugify("Café Niño & Co.")).toBe("cafe-nino-and-co");
    expect(slugify("Bo's Coffee")).toBe("bos-coffee");
    expect(slugify("☕")).toBe("shop");
  });

  it("dedupes against taken slugs", () => {
    const taken = new Set(["kape-uno-bacolod"]);
    expect(uniqueSlug("kape-uno-bacolod", taken)).toBe("kape-uno-bacolod-2");
    expect(uniqueSlug("kape-uno-bacolod", taken)).toBe("kape-uno-bacolod-3");
  });
});
