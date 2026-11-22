"use client";

import { trackShopEvent } from "@/lib/db";
import { hasSupabaseEnv } from "@/lib/env";
import type { InsightKind } from "@/lib/insights";
import { getBrowserSupabase } from "@/lib/supabase/browser";

/**
 * Count an anonymous shop event at most once per browser tab session (per shop and kind), so
 * reloads and repeat taps don't inflate owner stats. Never throws.
 */
export function trackOnce(slug: string, kind: InsightKind) {
  if (!hasSupabaseEnv() || !slug) return;
  const key = `kn:t:${kind}:${slug}`;
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
  } catch {
    // storage blocked: still count, just without de-duplication
  }
  void trackShopEvent(getBrowserSupabase(), slug, kind);
}
