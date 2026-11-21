"use client";

import { useEffect, useState } from "react";

import type { WeeklyHours } from "@/lib/db/hours";
import { openSummaryAt, type OpenSummary } from "@/lib/hours";
import { cn } from "@/lib/utils";

/**
 * Open/closed pill computed in the browser (Asia/Manila), so cached pages never show a stale
 * status. Renders an empty placeholder until mounted to avoid a hydration mismatch.
 */
export function LiveOpenStatus({
  hours,
  className,
}: {
  hours: WeeklyHours | null;
  className?: string;
}) {
  const [summary, setSummary] = useState<OpenSummary | null>(null);

  useEffect(() => {
    const tick = () => setSummary(openSummaryAt(hours, new Date()));
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [hours]);

  if (!summary)
    return <span className={cn("inline-block h-7 w-36", className)} aria-hidden="true" />;
  if (summary.state === "unknown") {
    return (
      <span className={cn("text-sm text-muted-foreground", className)}>Hours not listed yet</span>
    );
  }
  const open = summary.state === "open";
  return (
    <span className={cn("inline-flex items-center gap-2 text-sm", className)}>
      <span
        className={cn(
          "inline-flex h-7 items-center gap-1.5 rounded-full px-3 font-semibold",
          open ? "bg-[var(--type-kapihan)]/15 text-foreground" : "bg-muted text-muted-foreground",
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "size-2 rounded-full",
            open ? "bg-[var(--type-kapihan)]" : "bg-muted-foreground/60",
          )}
        />
        {open ? "Open now" : "Closed"}
      </span>
      {summary.detail && <span className="text-muted-foreground">{summary.detail}</span>}
    </span>
  );
}
