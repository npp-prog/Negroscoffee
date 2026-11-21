import { describe, expect, it } from "vitest";

import type { WeeklyHours } from "@/lib/db/hours";
import { manilaClock, openStateAt } from "@/lib/hours";

// 2026-11-23 is a Monday. Manila is UTC+8, so 01:00Z = 09:00 Manila.
const manila = (isoLocal: string) => new Date(`${isoLocal}+08:00`);

const hours: WeeklyHours = {
  mon: [
    { open: "08:00", close: "12:00" },
    { open: "13:00", close: "17:00" },
  ],
  tue: [],
  fri: [{ open: "18:00", close: "02:00" }],
  sun: [{ open: "07:00", close: "24:00" }],
};

describe("manilaClock", () => {
  it("converts to Manila wall-clock time across the UTC date line", () => {
    expect(manilaClock(new Date("2026-11-22T20:30:00Z"))).toEqual({
      day: "mon",
      minutes: 4 * 60 + 30,
    });
  });
});

describe("openStateAt", () => {
  it("is open inside a range and closed in the lunch gap", () => {
    expect(openStateAt(hours, manila("2026-11-23T09:00:00"))).toBe("open");
    expect(openStateAt(hours, manila("2026-11-23T12:30:00"))).toBe("closed");
    expect(openStateAt(hours, manila("2026-11-23T17:00:00"))).toBe("closed");
  });

  it("treats an empty day as closed and a missing day as unknown", () => {
    expect(openStateAt(hours, manila("2026-11-24T10:00:00"))).toBe("closed");
    expect(openStateAt(hours, manila("2026-11-25T10:00:00"))).toBe("unknown");
    expect(openStateAt(null)).toBe("unknown");
  });

  it("handles ranges past midnight", () => {
    expect(openStateAt(hours, manila("2026-11-27T23:00:00"))).toBe("open"); // Fri night
    expect(openStateAt(hours, manila("2026-11-28T01:30:00"))).toBe("open"); // Sat early
    expect(openStateAt(hours, manila("2026-11-28T02:00:00"))).toBe("unknown"); // Sat not recorded
  });

  it("treats 24:00 as end of day", () => {
    expect(openStateAt(hours, manila("2026-11-29T23:59:00"))).toBe("open");
  });
});
