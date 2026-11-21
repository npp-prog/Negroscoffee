import type { ShopDetail } from "@/lib/db";

/** Menu grouped by category, prices in tabular numerals. */
export function MenuPrices({ items }: { items: ShopDetail["menu"] }) {
  const groups = new Map<string, ShopDetail["menu"]>();
  for (const item of items) {
    const key = item.category?.trim() || "Menu";
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return (
    <div className="flex flex-col gap-5">
      {[...groups].map(([category, rows]) => (
        <section key={category}>
          {groups.size > 1 && (
            <h3 className="mb-1.5 font-sans text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">
              {category}
            </h3>
          )}
          <ul className="divide-y divide-border">
            {rows.map((item) => (
              <li key={item.id} className="flex items-baseline justify-between gap-4 py-2 text-sm">
                <span>{item.name}</span>
                <span className="shrink-0 font-semibold tabular">
                  {item.price != null ? `₱${Number(item.price).toLocaleString("en-PH")}` : "—"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
