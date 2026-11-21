import { PRICE_TIERS, PRICE_TIER_META, type PriceTier } from "@/lib/categories";
import { cn } from "@/lib/utils";

/** "₱₱··" style badge: filled symbols for the tier, faded for the rest. */
export function TierBadge({ tier, className }: { tier: PriceTier; className?: string }) {
  const meta = PRICE_TIER_META[tier];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center text-[12px] font-semibold tracking-tight whitespace-nowrap tabular",
        className,
      )}
      title={`${meta.label} · ${meta.range}`}
    >
      <span className="sr-only">
        {meta.label} ({meta.range})
      </span>
      <span aria-hidden="true">
        {PRICE_TIERS.map((t) => (
          <span key={t} className={t <= tier ? "text-foreground" : "text-muted-foreground/40"}>
            ₱
          </span>
        ))}
      </span>
    </span>
  );
}
