"use client";

import Link from "next/link";
import { ChevronRight, Coffee } from "lucide-react";

import { OpenStatus } from "@/components/shop/open-status";
import { TierBadge } from "@/components/shop/tier-badge";
import { TypeChip } from "@/components/shop/type-chip";
import { SHOP_TYPE_META } from "@/lib/categories";
import { shopPhotoUrl, type ShopCard as Shop } from "@/lib/db";
import { formatDistance } from "@/lib/geo";
import { SUPABASE_URL } from "@/lib/env";
import { cn } from "@/lib/utils";

function Thumb({ shop, className }: { shop: Shop; className?: string }) {
  if (shop.coverPath) {
    const src = shopPhotoUrl(SUPABASE_URL, shop.coverPath, { width: 160, height: 160 });
    return (
      // Supabase image transforms do the resizing; next/image would resize twice.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" loading="lazy" className={cn("rounded-xl object-cover", className)} />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn("grid place-items-center rounded-xl text-[var(--pin-foreground)]", className)}
      style={{ backgroundColor: SHOP_TYPE_META[shop.type].colorVar }}
    >
      <Coffee className="size-6 opacity-90" />
    </span>
  );
}

export function ShopCard({
  shop,
  selected,
  highlighted,
  distanceM,
  now,
  compact = false,
  onSelect,
  onHover,
}: {
  shop: Shop;
  selected?: boolean;
  highlighted?: boolean;
  distanceM?: number;
  now: Date;
  compact?: boolean;
  onSelect: (shop: Shop) => void;
  onHover?: (id: string | null) => void;
}) {
  const place = shop.cityName ?? shop.address;
  return (
    <article
      data-shop-slug={shop.slug}
      onMouseEnter={() => onHover?.(shop.id)}
      onMouseLeave={() => onHover?.(null)}
      className={cn(
        "group relative flex items-stretch gap-3 rounded-2xl border bg-surface p-2.5 transition-[border-color,box-shadow] duration-150",
        selected
          ? "border-crema shadow-soft ring-2 ring-crema/40"
          : highlighted
            ? "border-crema/60 shadow-soft"
            : "hover:shadow-soft",
      )}
    >
      <Thumb shop={shop} className={compact ? "size-16 shrink-0" : "size-20 shrink-0"} />
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 py-0.5">
        <h3 className="truncate font-sans text-[15px] leading-tight font-semibold">
          <button
            type="button"
            onClick={() => onSelect(shop)}
            aria-pressed={selected}
            className="text-left after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring"
          >
            {shop.name}
          </button>
        </h3>
        <div className="flex min-w-0 items-center gap-2 overflow-hidden text-muted-foreground">
          <TypeChip type={shop.type} />
          <span aria-hidden="true">·</span>
          <TierBadge tier={shop.priceTier} />
          {shop.lattePrice != null && (
            <span className="text-[12px] whitespace-nowrap tabular">
              ₱{Math.round(shop.lattePrice)}
              <span className="sr-only"> for a 12 oz latte</span>
            </span>
          )}
        </div>
        <div className="flex min-w-0 items-center gap-2 text-[12px] text-muted-foreground">
          <OpenStatus hours={shop.hours} now={now} />
          {place && <span className="truncate">{place}</span>}
          {distanceM != null && (
            <span className="ml-auto shrink-0 tabular">{formatDistance(distanceM)}</span>
          )}
        </div>
      </div>
      <Link
        href={`/shop/${shop.slug}`}
        className="relative z-10 -my-1 -mr-1 grid w-11 shrink-0 place-items-center self-stretch rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground"
        aria-label={`View ${shop.name} details`}
      >
        <ChevronRight className="size-5" />
      </Link>
    </article>
  );
}
