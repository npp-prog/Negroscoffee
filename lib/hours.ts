/**
 * Open-now logic. All shop hours are wall-clock times in Asia/Manila (UTC+8, no DST).
 * Framework-free so the Expo app can reuse it.
 */
import { WEEKDAYS, type TimeRange, type Weekday, type WeeklyHours } from "./db/hours";

export const SHOP_TIME_ZONE = "Asia/Manila";

const dayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: SHOP_TIME_ZONE,
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const SHORT_TO_DAY: Record<string, Weekday> = {
  Mon: "mon",
  Tue: "tue",
  Wed: "wed",
  Thu: "thu",
  Fri: "fri",
  Sat: "sat",
  Sun: "sun",
};

/** Weekday and minutes since midnight in Manila for an instant. */
export function manilaClock(at: Date): { day: Weekday; minutes: number } {
  const parts = dayFormatter.formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const day = SHORT_TO_DAY[get("weekday")] ?? "mon";
  return { day, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function previousDay(day: Weekday): Weekday {
  return WEEKDAYS[(WEEKDAYS.indexOf(day) + 6) % 7];
}

/** A range whose close is at or before its open runs past midnight (e.g. 18:00–02:00). */
function spansMidnight(r: TimeRange): boolean {
  return toMinutes(r.close) <= toMinutes(r.open);
}

export type OpenState = "open" | "closed" | "unknown";

/**
 * Whether a shop is open at `at`. Returns "unknown" when the day's hours were never recorded
 * (missing key), "closed" when recorded as closed or outside all ranges.
 */
export function openStateAt(
  hours: WeeklyHours | null | undefined,
  at: Date = new Date(),
): OpenState {
  if (!hours) return "unknown";
  const { day, minutes } = manilaClock(at);

  // Late ranges from yesterday that spill into today.
  const yesterday = hours[previousDay(day)];
  if (yesterday?.some((r) => spansMidnight(r) && minutes < toMinutes(r.close))) return "open";

  const today = hours[day];
  if (!today) return "unknown";
  const open = today.some((r) => {
    const start = toMinutes(r.open);
    const end = spansMidnight(r) ? 24 * 60 : toMinutes(r.close);
    return minutes >= start && minutes < end;
  });
  return open ? "open" : "closed";
}

export function isOpenAt(hours: WeeklyHours | null | undefined, at: Date = new Date()): boolean {
  return openStateAt(hours, at) === "open";
}
