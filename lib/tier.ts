import type { PriceTier } from "@/lib/categories";

/**
 * Price tier from a regular 12 oz hot latte price (PHP).
 * Mirrors public.price_tier_for() in supabase/migrations — keep both in sync.
 */
export function tierForLattePrice(lattePrice: number | null | undefined): PriceTier | null {
  if (lattePrice == null || !Number.isFinite(lattePrice) || lattePrice < 0) return null;
  if (lattePrice < 100) return 1;
  if (lattePrice < 150) return 2;
  if (lattePrice < 200) return 3;
  return 4;
}
