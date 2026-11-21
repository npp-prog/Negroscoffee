"use client";

import { useSyncExternalStore } from "react";

import { WEEKDAYS, type Weekday, type WeeklyHours } from "@/lib/db/hours";
import { formatRange, manilaClock, WEEKDAY_LABEL } from "@/lib/hours";
import { cn } from "@/lib/utils";

function subscribeMinute(onChange: () => void) {
  const id = setInterval(onChange, 60_000);
  return () => clearInterval(id);
}

/** Weekly hours, Monday first, with today (in Manila) highlighted once mounted. */
export function HoursTable({ hours }: { hours: WeeklyHours }) {
  const today = useSyncExternalStore<Weekday | null>(
    subscribeMinute,
    () => manilaClock(new Date()).day,
    () => null, // server and hydration: no highlight
  );

  return (
    <table className="w-full text-sm">
      <caption className="sr-only">Opening hours (Philippine time)</caption>
      <tbody>
        {WEEKDAYS.map((day) => {
          const ranges = hours[day];
          const isToday = day === today;
          return (
            <tr key={day} className={cn(isToday && "font-semibold")}>
              <th scope="row" className="py-1.5 pr-4 text-left font-[inherit]">
                {WEEKDAY_LABEL[day]}
                {isToday && <span className="sr-only"> (today)</span>}
              </th>
              <td className="py-1.5 text-right tabular">
                {ranges === undefined ? (
                  <span className="text-muted-foreground">Not listed</span>
                ) : ranges.length === 0 ? (
                  <span className="text-muted-foreground">Closed</span>
                ) : (
                  ranges.map((r) => <div key={r.open}>{formatRange(r)}</div>)
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
