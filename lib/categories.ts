/**
 * Shop categorization shared by web (and later mobile).
 * Keep free of framework imports.
 */

export const SHOP_TYPES = ["specialty", "chain", "kapihan"] as const;
export type ShopType = (typeof SHOP_TYPES)[number];

export const SHOP_TYPE_META: Record<
  ShopType,
  { label: string; description: string; colorVar: string }
> = {
  specialty: {
    label: "Specialty",
    description: "Independent, third-wave, single-origin or manual brew",
    colorVar: "var(--type-specialty)",
  },
  chain: {
    label: "Chain",
    description: "Two or more branches under one brand",
    colorVar: "var(--type-chain)",
  },
  kapihan: {
    label: "Local kapihan",
    description: "Neighborhood coffee spot, native coffee, merienda",
    colorVar: "var(--type-kapihan)",
  },
};

export const PRICE_TIERS = [1, 2, 3, 4] as const;
export type PriceTier = (typeof PRICE_TIERS)[number];

export const PRICE_TIER_META: Record<PriceTier, { label: string; symbol: string; range: string }> =
  {
    1: { label: "Budget", symbol: "₱", range: "Latte under ₱100" },
    2: { label: "Mid-range", symbol: "₱₱", range: "Latte ₱100–149" },
    3: { label: "Premium", symbol: "₱₱₱", range: "Latte ₱150–199" },
    4: { label: "Luxury", symbol: "₱₱₱₱", range: "Latte ₱200 and up" },
  };

export const PROVINCES = ["negros_occidental", "negros_oriental"] as const;
export type Province = (typeof PROVINCES)[number];

export const PROVINCE_LABEL: Record<Province, string> = {
  negros_occidental: "Negros Occidental",
  negros_oriental: "Negros Oriental",
};
