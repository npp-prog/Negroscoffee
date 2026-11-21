import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { StatusBadge } from "@/components/admin/status-badge";
import { PhotoManager } from "@/components/admin/photo-manager";
import { ShopEditor, type CityChoice } from "@/components/admin/shop-editor";
import type { AdminShop } from "@/lib/db";

export function EditorPage({
  shop,
  cities,
  created,
}: {
  shop: AdminShop | null;
  cities: CityChoice[];
  created?: boolean;
}) {
  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/admin/shops"
        className="inline-flex items-center gap-1.5 self-start text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> All shops
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-semibold">{shop ? shop.name : "New shop"}</h1>
        {shop && <StatusBadge status={shop.status} />}
        {shop?.source === "import_osm" && (
          <span className="text-[13px] text-muted-foreground">
            Imported from{" "}
            <a
              href={`https://www.openstreetmap.org/${shop.osmId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              OpenStreetMap
            </a>
          </span>
        )}
      </div>
      {created && (
        <p role="status" className="rounded-xl border bg-surface px-4 py-3 text-sm">
          Shop created as a draft. Add photos below, then publish when it&apos;s ready.
        </p>
      )}
      {shop && (
        <section className="flex flex-col gap-4 rounded-[20px] border bg-surface p-5 shadow-soft sm:p-6">
          <h2 className="text-lg font-semibold">Photos</h2>
          <PhotoManager shopId={shop.id} photos={shop.photos} />
        </section>
      )}
      <ShopEditor key={shop?.id ?? "new"} shop={shop} cities={cities} />
    </div>
  );
}
