"use client";

import { useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";

import { parseExploreState, serializeExploreState, type ExploreState } from "@/lib/filters";

export type UpdateExploreState = (
  patch: Partial<ExploreState>,
  opts?: { history?: "push" | "replace" },
) => void;

/**
 * Explore state lives in the URL (lib/filters.ts). Reads via useSearchParams; writes with the
 * native History API, which Next.js syncs into the router without a server round trip.
 * Filters replace the entry; selecting a shop pushes one so Back deselects it.
 */
export function useExploreState(): [ExploreState, UpdateExploreState] {
  const searchParams = useSearchParams();
  const state = useMemo(() => parseExploreState(searchParams), [searchParams]);

  const update = useCallback<UpdateExploreState>((patch, opts) => {
    const { pathname, search } = window.location;
    const current = parseExploreState(new URLSearchParams(search));
    const qs = serializeExploreState({ ...current, ...patch }, search);
    if (qs === search.replace(/^\?/, "")) return;
    const url = qs ? `${pathname}?${qs}` : pathname;
    if (opts?.history === "push") window.history.pushState(null, "", url);
    else window.history.replaceState(null, "", url);
  }, []);

  return [state, update];
}
