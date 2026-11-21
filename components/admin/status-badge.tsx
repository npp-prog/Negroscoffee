import { cn } from "@/lib/utils";

const STYLE = {
  published: "bg-[var(--type-kapihan)]/15 text-foreground",
  draft: "bg-muted text-muted-foreground",
  hidden: "bg-destructive/10 text-foreground",
  pending: "bg-crema/15 text-foreground",
  approved: "bg-[var(--type-kapihan)]/15 text-foreground",
  rejected: "bg-destructive/10 text-foreground",
} as const;

export function StatusBadge({
  status,
  className,
}: {
  status: keyof typeof STYLE;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full px-2.5 text-[12px] font-semibold capitalize",
        STYLE[status],
        className,
      )}
    >
      {status}
    </span>
  );
}
