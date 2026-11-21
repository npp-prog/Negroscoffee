/** Opening hours as stored in shops.hours (jsonb). Times are "HH:MM" in Asia/Manila. */
export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Weekday = (typeof WEEKDAYS)[number];
export type TimeRange = { open: string; close: string };
/** A missing day means "unknown"; an empty array means "closed all day". */
export type WeeklyHours = Partial<Record<Weekday, TimeRange[]>>;

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Narrow untrusted jsonb into WeeklyHours, dropping malformed entries. */
export function parseHours(value: unknown): WeeklyHours | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const out: WeeklyHours = {};
  for (const day of WEEKDAYS) {
    const ranges = (value as Record<string, unknown>)[day];
    if (!Array.isArray(ranges)) continue;
    out[day] = ranges.filter(
      (r): r is TimeRange =>
        !!r &&
        typeof r === "object" &&
        TIME.test((r as TimeRange).open) &&
        /^(([01]\d|2[0-3]):[0-5]\d|24:00)$/.test((r as TimeRange).close),
    );
  }
  return out;
}
