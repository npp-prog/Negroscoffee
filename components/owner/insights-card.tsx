"use client";

import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, Check, Heart, Minus } from "lucide-react";

import { RatingBadge } from "@/components/shop/stars";
import { change, METRICS, totals, type ShopInsights } from "@/lib/insights";
import { cn } from "@/lib/utils";

const dayLabel = (
  iso: string,
  opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" },
) =>
  new Date(`${iso}T00:00:00+08:00`).toLocaleDateString("en-PH", {
    ...opts,
    timeZone: "Asia/Manila",
  });

function Delta({ pct, days }: { pct: number | null; days: number }) {
  if (pct === null)
    return <span className="text-[12px] text-muted-foreground">No earlier data yet</span>;
  const Icon = pct > 0 ? ArrowUpRight : pct < 0 ? ArrowDownRight : Minus;
  return (
    <span className="flex flex-wrap items-center gap-x-1 text-[12px] text-muted-foreground">
      <Icon className="size-3.5" aria-hidden="true" />
      <span className="tabular">
        {pct > 0 ? "+" : ""}
        {pct}%
      </span>
      <span className="whitespace-nowrap">vs previous {days} days</span>
    </span>
  );
}

/** Daily page views as columns, with a hover readout and a table fallback. */
function ViewsChart({ insights }: { insights: ShopInsights }) {
  const [hover, setHover] = useState<number | null>(null);
  const series = insights.series;
  const max = Math.max(1, ...series.map((d) => d.views));
  const active = hover !== null ? series[hover] : null;
  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium">Page views per day</span>
        <span className="text-[13px] text-muted-foreground tabular" aria-live="polite">
          {active
            ? `${dayLabel(active.day, { weekday: "short", month: "short", day: "numeric" })}: ${active.views} view${active.views === 1 ? "" : "s"}`
            : series.some((d) => d.views > 0)
              ? `Busiest day: ${max} view${max === 1 ? "" : "s"}`
              : "No views yet"}
        </span>
      </figcaption>
      <div className="relative">
        <div
          className="flex h-32 items-end gap-[2px] border-b border-border"
          onMouseLeave={() => setHover(null)}
          aria-hidden="true"
        >
          {series.map((d, i) => (
            <div
              key={d.day}
              className="flex h-full flex-1 items-end justify-center"
              onMouseEnter={() => setHover(i)}
              onTouchStart={() => setHover(i)}
            >
              <div
                className={cn(
                  "w-full max-w-6 rounded-t-[4px] bg-[var(--chart-bar)] transition-opacity",
                  hover !== null && hover !== i && "opacity-50",
                )}
                style={{ height: d.views ? `${Math.max(3, (d.views / max) * 100)}%` : 0 }}
              />
            </div>
          ))}
        </div>
        <div
          className="mt-1 flex justify-between text-[12px] text-muted-foreground"
          aria-hidden="true"
        >
          <span>{dayLabel(insights.from)}</span>
          <span>Today</span>
        </div>
      </div>
      <details className="text-[13px]">
        <summary className="inline-flex min-h-11 cursor-pointer items-center text-muted-foreground hover:text-foreground">
          Show as table
        </summary>
        <table className="mt-2 w-full text-left tabular">
          <thead className="text-muted-foreground">
            <tr>
              <th className="py-1 font-medium">Day</th>
              <th className="py-1 font-medium">Views</th>
              <th className="py-1 font-medium">Map</th>
              <th className="py-1 font-medium">Directions</th>
              <th className="py-1 font-medium">Calls &amp; links</th>
            </tr>
          </thead>
          <tbody>
            {[...series].reverse().map((d) => (
              <tr key={d.day} className="border-t border-border">
                <td className="py-1">{dayLabel(d.day)}</td>
                <td className="py-1">{d.views}</td>
                <td className="py-1">{d.map}</td>
                <td className="py-1">{d.directions}</td>
                <td className="py-1">{d.contacts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

export function InsightsCard({
  insights,
  ratingAvg,
  ratingCount,
}: {
  insights: ShopInsights;
  ratingAvg: number | null;
  ratingCount: number;
}) {
  const now = totals(insights.series);
  return (
    <section
      aria-labelledby="insights-h"
      className="flex flex-col gap-5 rounded-[20px] border bg-surface p-5 shadow-soft sm:p-6"
    >
      <div className="flex flex-col gap-1">
        <h2 id="insights-h" className="text-lg font-semibold">
          Insights · last {insights.days} days
        </h2>
        <p className="text-[13px] text-muted-foreground">
          Counted anonymously. Each visitor counts once per visit for each action.
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {METRICS.map((m) => (
          <div key={m.key} className="flex flex-col gap-1 rounded-2xl border p-4">
            <dt className="text-[13px] text-muted-foreground" title={m.hint}>
              {m.label}
            </dt>
            <dd className="flex flex-col gap-0.5">
              <span className="text-3xl font-semibold tabular">{now[m.key]}</span>
              <Delta pct={change(now[m.key], insights.previous[m.key])} days={insights.days} />
            </dd>
          </div>
        ))}
      </dl>
      <ViewsChart insights={insights} />
      <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <li className="inline-flex items-center gap-1.5">
          <Heart className="size-4 text-muted-foreground" aria-hidden="true" />
          <span className="font-semibold tabular">{insights.favorites}</span> saved as favorite
        </li>
        <li className="inline-flex items-center gap-1.5">
          <Check className="size-4 text-muted-foreground" aria-hidden="true" />
          <span className="font-semibold tabular">{insights.visited}</span> marked &ldquo;been
          here&rdquo;
        </li>
        <li className="inline-flex items-center gap-1.5">
          {ratingCount > 0 ? (
            <RatingBadge avg={ratingAvg} count={ratingCount} className="text-sm" />
          ) : (
            <span className="text-muted-foreground">No reviews yet</span>
          )}
        </li>
      </ul>
    </section>
  );
}
