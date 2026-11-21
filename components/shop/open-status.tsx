import type { WeeklyHours } from "@/lib/db/hours";
import { openStateAt } from "@/lib/hours";
import { cn } from "@/lib/utils";

export function OpenStatus({
  hours,
  now,
  className,
}: {
  hours: WeeklyHours | null;
  now: Date;
  className?: string;
}) {
  const state = openStateAt(hours, now);
  if (state === "unknown") return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[12px] font-medium",
        state === "open" ? "text-foreground" : "text-muted-foreground",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 rounded-full",
          state === "open" ? "bg-[var(--type-kapihan)]" : "bg-muted-foreground/50",
        )}
      />
      {state === "open" ? "Open now" : "Closed"}
    </span>
  );
}
