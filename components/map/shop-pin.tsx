"use client";

import { memo } from "react";
import { Coffee } from "lucide-react";

import { PRICE_TIER_META, SHOP_TYPE_META } from "@/lib/categories";
import type { ShopCard } from "@/lib/db";
import { cn } from "@/lib/utils";

/** Pin colored by shop type, with a tier badge. The button itself is a 44px touch target. */
export const ShopPin = memo(function ShopPin({
  shop,
  selected,
  highlighted,
  onSelect,
  onHover,
}: {
  shop: ShopCard;
  selected: boolean;
  highlighted: boolean;
  onSelect: (shop: ShopCard) => void;
  onHover: (id: string | null) => void;
}) {
  const tier = PRICE_TIER_META[shop.priceTier];
  const active = selected || highlighted;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onSelect(shop);
      }}
      onMouseEnter={() => onHover(shop.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(shop.id)}
      onBlur={() => onHover(null)}
      aria-pressed={selected}
      aria-label={`${shop.name}, ${SHOP_TYPE_META[shop.type].label}, ${tier.label}`}
      className="group relative grid size-11 place-items-center rounded-full focus-visible:outline-none"
      style={{ zIndex: selected ? 3 : highlighted ? 2 : 1 }}
    >
      <span
        className={cn(
          "relative grid size-8 place-items-center rounded-full border-2 border-surface text-[var(--pin-foreground)] shadow-float transition-transform duration-200 ease-out motion-reduce:transition-none",
          "group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2",
          active && "scale-[1.18]",
          selected && "ring-2 ring-crema ring-offset-1 ring-offset-surface",
        )}
        style={{ backgroundColor: SHOP_TYPE_META[shop.type].colorVar }}
      >
        <Coffee className="size-4" aria-hidden="true" />
        <span
          aria-hidden="true"
          className="absolute -right-3.5 -bottom-1.5 rounded-full border border-border bg-surface px-1 text-[10px] leading-[15px] font-bold tracking-tighter text-foreground tabular shadow-soft"
        >
          {tier.symbol}
        </span>
      </span>
      {selected && (
        <span className="pointer-events-none absolute top-full left-1/2 mt-0.5 max-w-40 -translate-x-1/2 truncate rounded-full bg-surface px-2.5 py-0.5 text-[12px] font-semibold text-foreground shadow-float">
          {shop.name}
        </span>
      )}
    </button>
  );
});

/** Cluster bubble: count in the middle, ring split by shop type share. */
export const ClusterPin = memo(function ClusterPin({
  count,
  byType,
  onClick,
}: {
  count: number;
  byType: { specialty: number; chain: number; kapihan: number };
  onClick: () => void;
}) {
  const size = Math.round(Math.min(64, 38 + Math.log2(count) * 5));
  const total = byType.specialty + byType.chain + byType.kapihan || 1;
  const a = (byType.specialty / total) * 360;
  const b = a + (byType.chain / total) * 360;
  const ring = `conic-gradient(var(--type-specialty) 0deg ${a}deg, var(--type-chain) ${a}deg ${b}deg, var(--type-kapihan) ${b}deg 360deg)`;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={`${count} coffee shops. Zoom in`}
      className="grid place-items-center rounded-full p-[3px] shadow-float transition-transform duration-150 hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none"
      style={{ width: Math.max(44, size), height: Math.max(44, size), background: ring }}
    >
      <span className="grid size-full place-items-center rounded-full bg-surface text-[13px] font-bold text-foreground tabular">
        {count}
      </span>
    </button>
  );
});

export function UserLocationDot() {
  return (
    <span className="relative grid size-5 place-items-center" role="img" aria-label="Your location">
      <span className="absolute inset-0 animate-ping rounded-full bg-sky-500/40 motion-reduce:animate-none" />
      <span className="size-4 rounded-full border-[3px] border-white bg-sky-500 shadow-float" />
    </span>
  );
}
