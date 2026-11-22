import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, ChevronRight, ExternalLink } from "lucide-react";

import { StatusBadge } from "@/components/admin/status-badge";
import { TierBadge } from "@/components/shop/tier-badge";
import { getViewer } from "@/lib/admin-server";
import { listOwnedShops } from "@/lib/db";

export const metadata: Metadata = { title: "My shops" };

export default async function OwnerHome() {
  const { db, user } = await getViewer();
  const shops = user ? await listOwnedShops(db, user.id) : [];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold">{shops.length === 1 ? "My shop" : "My shops"}</h1>
        <p className="text-muted-foreground">
          Keep your prices, hours, menu and photos up to date. Changes show on Kape Negros right
          away.
        </p>
      </header>

      {shops.length === 0 ? (
        <p className="rounded-[20px] border border-dashed p-8 text-center text-muted-foreground">
          No shop is linked to this account yet. After your claim is approved, it will appear here.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {shops.map((s) => (
            <li
              key={s.id}
              className="flex items-stretch gap-2 rounded-[20px] border bg-surface shadow-soft"
            >
              <Link
                href={`/owner/shops/${s.id}`}
                className="flex min-w-0 flex-1 items-center gap-3 p-5 hover:bg-accent/40"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-lg font-semibold">{s.name}</span>
                    {s.verifiedAt && (
                      <BadgeCheck className="size-4 text-crema" aria-label="Verified" />
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                    {s.cityName && <span>{s.cityName}</span>}
                    {s.priceTier && <TierBadge tier={s.priceTier} />}
                    {s.lattePrice != null && (
                      <span className="tabular">Latte ₱{Math.round(s.lattePrice)}</span>
                    )}
                    <StatusBadge status={s.status} />
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-sm font-medium">
                  Edit <ChevronRight className="size-4" aria-hidden="true" />
                </span>
              </Link>
              {s.status === "published" && (
                <Link
                  href={`/shop/${s.slug}`}
                  target="_blank"
                  aria-label={`Open ${s.name} public page`}
                  className="grid w-14 shrink-0 place-items-center border-l text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                >
                  <ExternalLink className="size-4" />
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
