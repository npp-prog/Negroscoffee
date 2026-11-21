"use client";

import { useState } from "react";
import { Copy, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { WEEKDAYS, type TimeRange, type Weekday, type WeeklyHours } from "@/lib/db/hours";
import { WEEKDAY_LABEL } from "@/lib/hours";
import { cn } from "@/lib/utils";

type Mode = "unknown" | "closed" | "open";
type DayState = { mode: Mode; ranges: TimeRange[] };

const DEFAULT_RANGE: TimeRange = { open: "08:00", close: "20:00" };

function fromHours(h: WeeklyHours | null): Record<Weekday, DayState> {
  return Object.fromEntries(
    WEEKDAYS.map((d) => {
      const r = h?.[d];
      const state: DayState =
        r === undefined
          ? { mode: "unknown", ranges: [DEFAULT_RANGE] }
          : r.length === 0
            ? { mode: "closed", ranges: [DEFAULT_RANGE] }
            : { mode: "open", ranges: r };
      return [d, state];
    }),
  ) as Record<Weekday, DayState>;
}

function toHours(s: Record<Weekday, DayState>): WeeklyHours {
  const out: WeeklyHours = {};
  for (const d of WEEKDAYS) {
    if (s[d].mode === "closed") out[d] = [];
    if (s[d].mode === "open") out[d] = s[d].ranges.filter((r) => r.open && r.close);
  }
  return out;
}

/** Per-day hours in Asia/Manila. "Close" may be earlier than "open" for past-midnight hours. */
export function HoursEditor({ name, initial }: { name: string; initial: WeeklyHours | null }) {
  const [days, setDays] = useState(() => fromHours(initial));
  const set = (d: Weekday, next: Partial<DayState>) =>
    setDays((s) => ({ ...s, [d]: { ...s[d], ...next } }));
  const setRange = (d: Weekday, i: number, key: keyof TimeRange, value: string) =>
    set(d, {
      ranges: days[d].ranges.map((r, j) =>
        j === i ? { ...r, [key]: value === "00:00" && key === "close" ? "24:00" : value } : r,
      ),
    });

  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name={name} value={JSON.stringify(toHours(days))} />
      {WEEKDAYS.map((d) => (
        <div
          key={d}
          className="flex flex-wrap items-start gap-2 rounded-xl border bg-background/50 p-2"
        >
          <span className="w-24 pt-2.5 text-sm font-medium">{WEEKDAY_LABEL[d]}</span>
          <div
            role="radiogroup"
            aria-label={`${WEEKDAY_LABEL[d]} hours`}
            className="flex rounded-full border bg-surface p-0.5"
          >
            {(["open", "closed", "unknown"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={days[d].mode === m}
                onClick={() => set(d, { mode: m })}
                className={cn(
                  "h-9 rounded-full px-3 text-[13px] font-medium capitalize",
                  days[d].mode === m
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m === "unknown" ? "Not listed" : m}
              </button>
            ))}
          </div>
          {days[d].mode === "open" && (
            <div className="flex flex-col gap-1.5">
              {days[d].ranges.map((r, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <input
                    type="time"
                    aria-label={`${WEEKDAY_LABEL[d]} opens`}
                    value={r.open}
                    onChange={(e) => setRange(d, i, "open", e.target.value)}
                    className="h-10 rounded-lg border bg-surface px-2 text-sm tabular"
                  />
                  <span className="text-muted-foreground">–</span>
                  <input
                    type="time"
                    aria-label={`${WEEKDAY_LABEL[d]} closes`}
                    value={r.close === "24:00" ? "00:00" : r.close}
                    onChange={(e) => setRange(d, i, "close", e.target.value)}
                    className="h-10 rounded-lg border bg-surface px-2 text-sm tabular"
                  />
                  {days[d].ranges.length > 1 && (
                    <button
                      type="button"
                      onClick={() => set(d, { ranges: days[d].ranges.filter((_, j) => j !== i) })}
                      className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-accent"
                      aria-label="Remove time range"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>
              ))}
              {days[d].ranges.length < 3 && (
                <button
                  type="button"
                  onClick={() =>
                    set(d, { ranges: [...days[d].ranges, { open: "13:00", close: "17:00" }] })
                  }
                  className="inline-flex h-8 items-center gap-1 self-start rounded-full px-2 text-[12px] font-medium text-muted-foreground hover:bg-accent"
                >
                  <Plus className="size-3.5" aria-hidden="true" /> Split shift
                </button>
              )}
            </div>
          )}
        </div>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="self-start"
        onClick={() =>
          setDays(
            (s) =>
              Object.fromEntries(
                WEEKDAYS.map((d) => [d, { ...s.mon, ranges: [...s.mon.ranges] }]),
              ) as Record<Weekday, DayState>,
          )
        }
      >
        <Copy /> Copy Monday to every day
      </Button>
      <p className="text-[12px] text-muted-foreground">
        Philippine time. A close time of 00:00 means midnight; earlier than opening means past
        midnight.
      </p>
    </div>
  );
}
