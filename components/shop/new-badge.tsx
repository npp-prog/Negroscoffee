"use client";

import { useSyncExternalStore } from "react";
import { Sparkles } from "lucide-react";

import { isNewShop } from "@/lib/new";
import { cn } from "@/lib/utils";

const noop = () => () => {};

/**
 * "New" pill for shops published in the last 14 days. Decided in the browser (the server
 * may prerender pages, where reading the clock isn't allowed); renders nothing on the server.
 */
export function NewBadge({
  publishedAt,
  className,
}: {
  publishedAt: string | null;
  className?: string;
}) {
  const show = useSyncExternalStore(
    noop,
    () => isNewShop(publishedAt),
    () => false,
  );
  if (!show) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-crema/15 px-2 py-0.5 text-[11px] font-semibold text-foreground",
        className,
      )}
    >
      <Sparkles className="size-3 text-crema" aria-hidden="true" /> New
    </span>
  );
}
