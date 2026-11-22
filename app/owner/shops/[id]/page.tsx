import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { OwnerEditor } from "@/components/owner/owner-editor";
import { PhotoManager } from "@/components/admin/photo-manager";
import { getViewer } from "@/lib/admin-server";
import { getAdminShop } from "@/lib/db";

export const metadata: Metadata = { title: "Edit my shop" };

export default async function OwnerShopPage({ params }: PageProps<"/owner/shops/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { db, user, role } = await getViewer();
  const shop = user ? await getAdminShop(db, id) : null;
  // Published shops are readable by everyone, so check ownership explicitly.
  if (!shop || (shop.claimedBy !== user?.id && role !== "admin")) notFound();

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/owner"
        className="inline-flex items-center gap-1.5 self-start text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> My shops
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold">{shop.name}</h1>
        {shop.status === "published" && (
          <Link
            href={`/shop/${shop.slug}`}
            target="_blank"
            className="inline-flex items-center gap-1 text-sm font-medium hover:underline"
          >
            View public page <ExternalLink className="size-3.5" aria-hidden="true" />
          </Link>
        )}
      </div>
      <section className="flex flex-col gap-4 rounded-[20px] border bg-surface p-5 shadow-soft sm:p-6">
        <h2 className="text-lg font-semibold">Photos</h2>
        <PhotoManager shopId={shop.id} photos={shop.photos} />
      </section>
      <OwnerEditor shop={shop} />
    </div>
  );
}
