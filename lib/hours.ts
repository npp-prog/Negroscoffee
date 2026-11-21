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

/** "7:00 AM", "12:30 PM"; "24:00" reads as "midnight". */
export function formatTime(hhmm: string): string {
  if (hhmm === "24:00" || hhmm === "00:00") return "midnight";
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function formatRange(r: TimeRange): string {
  if (r.open === "00:00" && r.close === "24:00") return "Open 24 hours";
  return `${formatTime(r.open)} – ${formatTime(r.close)}`;
}

export const WEEKDAY_LABEL: Record<Weekday, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

const SHORT_LABEL: Record<Weekday, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

export type OpenSummary = { state: OpenState; detail: string | null };

/**
 * Open state plus a short hint: "Closes 9:00 PM", "Opens 7:00 AM", "Opens Tue 7:00 AM".
 * The hint is null when it can't be worked out from the recorded hours.
 */
export function openSummaryAt(
  hours: WeeklyHours | null | undefined,
  at: Date = new Date(),
): OpenSummary {
  const state = openStateAt(hours, at);
  if (!hours || state === "unknown") return { state, detail: null };
  const { day, minutes } = manilaClock(at);
  const dayIdx = WEEKDAYS.indexOf(day);

  if (state === "open") {
    const yesterday = hours[previousDay(day)]?.find(
      (r) => spansMidnight(r) && minutes < toMinutes(r.close),
    );
    const current =
      yesterday ??
      hours[day]?.find((r) => {
        const end = spansMidnight(r) ? 24 * 60 : toMinutes(r.close);
        return minutes >= toMinutes(r.open) && minutes < end;
      });
    if (!current) return { state, detail: null };
    if (current.open === "00:00" && current.close === "24:00") {
      return { state, detail: "Open 24 hours" };
    }
    return { state, detail: `Closes ${formatTime(current.close)}` };
  }

  // Closed: find the next opening within a week.
  for (let offset = 0; offset < 7; offset++) {
    const d = WEEKDAYS[(dayIdx + offset) % 7];
    const ranges = hours[d];
    if (!ranges) return { state, detail: null }; // unknown day ahead: don't guess
    const next = ranges
      .filter((r) => offset > 0 || toMinutes(r.open) > minutes)
      .sort((a, b) => toMinutes(a.open) - toMinutes(b.open))[0];
    if (next) {
      const when = offset === 0 ? "" : offset === 1 ? "tomorrow " : `${SHORT_LABEL[d]} `;
      return { state, detail: `Opens ${when}${formatTime(next.open)}` };
    }
  }
  return { state, detail: null };
}
