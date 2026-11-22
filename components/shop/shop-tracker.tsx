"use client";

import { useEffect } from "react";

import type { InsightKind } from "@/lib/insights";
import { trackOnce } from "@/lib/track";

const KINDS = new Set<InsightKind>(["directions", "contact"]);

/**
 * Counts a page view, plus taps on links marked `data-track="directions" | "contact"`.
 * Runs in the browser only, so bots that don't run JavaScript aren't counted.
 */
export function ShopTracker({ slug }: { slug: string }) {
  useEffect(() => {
    trackOnce(slug, "view");
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.("[data-track]");
      const kind = el?.getAttribute("data-track") as InsightKind | null;
      if (kind && KINDS.has(kind)) trackOnce(slug, kind);
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, [slug]);
  return null;
}
