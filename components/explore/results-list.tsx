import { CupIllustration } from "@/components/brand/cup-illustration";
import { Skeleton } from "@/components/ui/skeleton";

export function ResultsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <ul className="flex flex-col gap-3" aria-busy="true" aria-label="Loading shops">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="flex gap-3 rounded-2xl border bg-surface p-3">
          <Skeleton className="size-20 shrink-0 rounded-xl" />
          <div className="flex flex-1 flex-col gap-2 py-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="mt-auto h-3 w-1/3" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ResultsEmpty({
  title = "No shops here yet",
  body = "Try clearing a filter or moving the map.",
  action,
}: {
  title?: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      <CupIllustration className="w-32" />
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="max-w-xs text-sm text-muted-foreground">{body}</p>
      {action}
    </div>
  );
}
