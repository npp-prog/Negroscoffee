import { SHOP_TYPE_META, type ShopType } from "@/lib/categories";
import { cn } from "@/lib/utils";

export function TypeChip({ type, className }: { type: ShopType; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[12px] font-medium whitespace-nowrap",
        className,
      )}
    >
      <span
        className="size-2 rounded-full"
        style={{ backgroundColor: SHOP_TYPE_META[type].colorVar }}
        aria-hidden="true"
      />
      {SHOP_TYPE_META[type].label}
    </span>
  );
}
