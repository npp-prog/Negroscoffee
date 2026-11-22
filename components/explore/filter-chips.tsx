"use client";

import { Clock, Sparkles } from "lucide-react";

import {
  PRICE_TIERS,
  PRICE_TIER_META,
  SHOP_TYPES,
  SHOP_TYPE_META,
  type PriceTier,
  type ShopType,
} from "@/lib/categories";
import { toggleValue } from "@/lib/filters";
import { cn } from "@/lib/utils";

type ChipFilters = { tiers: PriceTier[]; types: ShopType[]; openNow: boolean; newOnly: boolean };

export function FilterChips({
  filters,
  onChange,
  className,
  wrap = false,
}: {
  filters: ChipFilters;
  onChange: (patch: Partial<ChipFilters>) => void;
  className?: string;
  /** Wrap onto multiple lines (desktop panel) instead of horizontal scroll (mobile). */
  wrap?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label="Filters"
      className={cn(
        "flex gap-2",
        wrap
          ? "flex-wrap"
          : "no-scrollbar -mx-4 snap-x scroll-px-4 [scrollbar-width:none] overflow-x-auto px-4 pb-1",
        className,
      )}
    >
      <Chip pressed={filters.openNow} onClick={() => onChange({ openNow: !filters.openNow })}>
        <Clock className="size-3.5" aria-hidden="true" />
        Open now
      </Chip>
      <Chip pressed={filters.newOnly} onClick={() => onChange({ newOnly: !filters.newOnly })}>
        <Sparkles className="size-3.5" aria-hidden="true" />
        New
      </Chip>
      {SHOP_TYPES.map((type) => (
        <Chip
          key={type}
          pressed={filters.types.includes(type)}
          onClick={() => onChange({ types: toggleValue(filters.types, type) })}
        >
          <span
            className="size-2.5 rounded-full"
            style={{ backgroundColor: SHOP_TYPE_META[type].colorVar }}
            aria-hidden="true"
          />
          {SHOP_TYPE_META[type].label}
        </Chip>
      ))}
      {PRICE_TIERS.map((tier) => (
        <Chip
          key={tier}
          pressed={filters.tiers.includes(tier)}
          onClick={() => onChange({ tiers: toggleValue(filters.tiers, tier) })}
          aria-label={`${PRICE_TIER_META[tier].label}: ${PRICE_TIER_META[tier].range}`}
        >
          <span className="font-semibold tracking-tight tabular">
            {PRICE_TIER_META[tier].symbol}
          </span>
          <span className="text-current/70">{PRICE_TIER_META[tier].label}</span>
        </Chip>
      ))}
    </div>
  );
}

function Chip({
  pressed,
  className,
  children,
  ...props
}: React.ComponentProps<"button"> & { pressed: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cn(
        "inline-flex h-9 shrink-0 snap-start items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium whitespace-nowrap shadow-soft transition-colors duration-150",
        "relative after:absolute after:inset-x-0 after:-inset-y-1 after:content-['']", // 44px touch target
        pressed
          ? "border-transparent bg-primary text-primary-foreground"
          : "border-border bg-surface text-foreground hover:bg-accent",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
