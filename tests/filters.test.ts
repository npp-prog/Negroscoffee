import { describe, expect, it } from "vitest";

import {
  EMPTY_STATE,
  hasActiveFilters,
  parseExploreState,
  serializeExploreState,
} from "@/lib/filters";

const parse = (qs: string) => parseExploreState(new URLSearchParams(qs));

describe("parseExploreState", () => {
  it("returns the empty state for an empty query", () => {
    expect(parse("")).toEqual(EMPTY_STATE);
  });

  it("parses every key", () => {
    expect(
      parse("q=brew&type=kapihan,specialty&tier=2,1&open=1&city=bacolod&shop=kape-ni-lola"),
    ).toEqual({
      q: "brew",
      types: ["specialty", "kapihan"],
      tiers: [1, 2],
      openNow: true,
      city: "bacolod",
      shop: "kape-ni-lola",
    });
  });

  it("drops unknown and malformed values", () => {
    const s = parse("type=bar,chain,chain&tier=0,5,x,3&open=yes&city=Bad%20City&shop=../x");
    expect(s.types).toEqual(["chain"]);
    expect(s.tiers).toEqual([3]);
    expect(s.openNow).toBe(false);
    expect(s.city).toBeNull();
    expect(s.shop).toBeNull();
  });

  it("caps the search length", () => {
    expect(parse(`q=${"a".repeat(200)}`).q).toHaveLength(80);
  });
});

describe("serializeExploreState", () => {
  it("writes a clean URL for the default state", () => {
    expect(serializeExploreState(EMPTY_STATE)).toBe("");
  });

  it("round-trips", () => {
    const state = parse("q=latte&type=chain&tier=4,3&open=1&city=dumaguete&shop=abc");
    expect(parse(serializeExploreState(state))).toEqual(state);
  });

  it("uses canonical order and keeps unrelated params", () => {
    const qs = serializeExploreState({ tiers: [3, 1], types: ["kapihan", "chain"] }, "utm=x&q=old");
    const params = new URLSearchParams(qs);
    expect(params.get("utm")).toBe("x");
    expect(params.get("q")).toBeNull();
    expect(params.get("tier")).toBe("1,3");
    expect(params.get("type")).toBe("chain,kapihan");
  });
});

describe("hasActiveFilters", () => {
  it("ignores whitespace-only search and the selected shop", () => {
    expect(hasActiveFilters({ ...EMPTY_STATE, q: "  " })).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_STATE, tiers: [2] })).toBe(true);
  });
});
