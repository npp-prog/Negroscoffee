"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { bulkStatusAction } from "@/app/admin/shops/actions";
import { StatusBadge } from "@/components/admin/status-badge";
import { TierBadge } from "@/components/shop/tier-badge";
import { TypeChip } from "@/components/shop/type-chip";
import { Button } from "@/components/ui/button";
import type { AdminShopRow, ShopStatus } from "@/lib/db";

export function ShopsTable({ rows }: { rows: AdminShopRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const all = rows.length > 0 && selected.size === rows.length;

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  function apply(status: ShopStatus) {
    start(async () => {
      const res = await bulkStatusAction([...selected], status);
      if (!res.ok) return void toast.error(res.error);
      toast.success(`${res.changed} shop${res.changed === 1 ? "" : "s"} set to ${status}`, {
        description: res.skipped.length
          ? `Skipped ${res.skipped.length} not ready to publish (needs type, price tier and province): ${res.skipped.slice(0, 3).join(", ")}${res.skipped.length > 3 ? "…" : ""}`
          : undefined,
      });
      setSelected(new Set());
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        className="sticky top-16 z-10 flex min-h-12 flex-wrap items-center gap-2 rounded-2xl border bg-surface/95 px-3 py-2 shadow-soft backdrop-blur"
        role="toolbar"
        aria-label="Bulk actions"
      >
        <span className="mr-auto text-sm text-muted-foreground" aria-live="polite">
          {selected.size ? `${selected.size} selected` : "Select shops for bulk actions"}
        </span>
        <Button
          size="sm"
          variant="crema"
          disabled={!selected.size || pending}
          onClick={() => apply("published")}
        >
          Publish
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={!selected.size || pending}
          onClick={() => apply("hidden")}
        >
          Hide
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={!selected.size || pending}
          onClick={() => apply("draft")}
        >
          Move to draft
        </Button>
      </div>

      <div className="overflow-x-auto rounded-[20px] border bg-surface shadow-soft">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b text-left text-[12px] font-semibold tracking-wide text-muted-foreground uppercase">
            <tr>
              <th className="w-12 p-3">
                <input
                  type="checkbox"
                  aria-label="Select all shops on this page"
                  checked={all}
                  onChange={() => setSelected(all ? new Set() : new Set(rows.map((r) => r.id)))}
                  className="size-5 accent-[var(--accent-brand)]"
                />
              </th>
              <th className="p-3">Shop</th>
              <th className="p-3">Type</th>
              <th className="p-3">Tier</th>
              <th className="p-3">Status</th>
              <th className="p-3">Updated</th>
              <th className="w-12 p-3">
                <span className="sr-only">Public page</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr key={r.id} className={selected.has(r.id) ? "bg-crema/5" : "hover:bg-accent/40"}>
                <td className="p-3">
                  <input
                    type="checkbox"
                    aria-label={`Select ${r.name}`}
                    checked={selected.has(r.id)}
                    onChange={() => toggle(r.id)}
                    className="size-5 accent-[var(--accent-brand)]"
                  />
                </td>
                <td className="max-w-72 p-3">
                  <Link href={`/admin/shops/${r.id}`} className="font-semibold hover:underline">
                    {r.name}
                  </Link>
                  <div className="truncate text-[12px] text-muted-foreground">
                    {[
                      r.cityName,
                      r.source === "import_osm"
                        ? "OSM import"
                        : r.source === "owner"
                          ? "Owner"
                          : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "No town"}
                  </div>
                </td>
                <td className="p-3">
                  {r.type ? (
                    <TypeChip type={r.type} />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="p-3">
                  {r.priceTier ? (
                    <TierBadge tier={r.priceTier} />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                  {r.lattePrice != null && (
                    <span className="ml-2 text-[12px] text-muted-foreground tabular">
                      ₱{Math.round(r.lattePrice)}
                    </span>
                  )}
                </td>
                <td className="p-3">
                  <span className="inline-flex items-center gap-1.5">
                    <StatusBadge status={r.status} />
                    {!r.ready && (
                      <span title="Needs type, price tier and province before publishing">
                        <AlertTriangle
                          className="size-4 text-crema"
                          aria-label="Not ready to publish"
                        />
                      </span>
                    )}
                  </span>
                </td>
                <td className="p-3 text-[12px] text-muted-foreground tabular">
                  {new Date(r.updatedAt).toLocaleDateString("en-PH", {
                    timeZone: "Asia/Manila",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </td>
                <td className="p-3">
                  {r.status === "published" && (
                    <Link
                      href={`/shop/${r.slug}`}
                      target="_blank"
                      className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
                      aria-label={`Open ${r.name} public page`}
                    >
                      <ExternalLink className="size-4" />
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
