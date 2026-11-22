import { describe, expect, it } from "vitest";

import { change, parseInsights, totals } from "@/lib/insights";

describe("insights helpers", () => {
  it("sums a series", () => {
    expect(
      totals([
        { day: "2026-11-21", views: 3, map: 1, directions: 2, contacts: 0 },
        { day: "2026-11-22", views: 4, map: 0, directions: 1, contacts: 1 },
      ]),
    ).toEqual({ views: 7, map: 1, directions: 3, contacts: 1 });
  });

  it("computes change only with a baseline", () => {
    expect(change(15, 10)).toBe(50);
    expect(change(5, 10)).toBe(-50);
    expect(change(5, 0)).toBeNull();
  });

  it("parses the RPC payload defensively", () => {
    const p = parseInsights({
      days: 30,
      from: "2026-10-24",
      to: "2026-11-22",
      series: [{ day: "2026-11-22", views: "2", map: 1, directions: null, contacts: 0 }],
      previous: { views: 5 },
      favorites: "3",
      visited: 1,
    });
    expect(p?.series[0]).toEqual({
      day: "2026-11-22",
      views: 2,
      map: 1,
      directions: 0,
      contacts: 0,
    });
    expect(p?.previous).toEqual({ views: 5, map: 0, directions: 0, contacts: 0 });
    expect(p?.favorites).toBe(3);
    expect(parseInsights(null)).toBeNull();
  });
});
