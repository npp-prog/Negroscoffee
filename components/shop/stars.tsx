import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

/** Five stars filled to the nearest half. Decorative: pair with a text label. */
export function Stars({
  value,
  className,
  size = "size-4",
}: {
  value: number;
  className?: string;
  size?: string;
}) {
  const rounded = Math.round(value * 2) / 2;
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-hidden="true">
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = rounded >= i ? 1 : rounded >= i - 0.5 ? 0.5 : 0;
        return (
          <span key={i} className={cn("relative inline-block", size)}>
            <Star className={cn("absolute inset-0 text-crema/30", size)} strokeWidth={1.5} />
            {fill > 0 && (
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: fill === 1 ? "100%" : "50%" }}
              >
                <Star className={cn("fill-crema text-crema", size)} strokeWidth={1.5} />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}

/** "★ 4.6 (12)" summary for cards and headers. */
export function RatingBadge({
  avg,
  count,
  className,
}: {
  avg: number | null;
  count: number;
  className?: string;
}) {
  if (!count || avg == null) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[12px] font-medium whitespace-nowrap",
        className,
      )}
    >
      <Star className="size-3.5 fill-crema text-crema" aria-hidden="true" />
      <span className="tabular">{avg.toFixed(1)}</span>
      <span className="text-muted-foreground tabular">({count})</span>
      <span className="sr-only">
        average rating {avg.toFixed(1)} out of 5 from {count} review{count === 1 ? "" : "s"}
      </span>
    </span>
  );
}
