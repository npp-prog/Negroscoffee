import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EditorPage } from "@/components/admin/editor-page";
import { getActiveClaimInvite, getAdminShop, getOwnerEmail, listCities } from "@/lib/db";
import { getServerSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Edit shop" };

export default async function EditShopPage({
  params,
  searchParams,
}: PageProps<"/admin/shops/[id]">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = await getServerSupabase();
  const [shop, cities, ownerEmail, invite] = await Promise.all([
    getAdminShop(db, id),
    listCities(db),
    getOwnerEmail(db, id).catch(() => null),
    getActiveClaimInvite(db, id).catch(() => null),
  ]);
  if (!shop) notFound();
  return (
    <EditorPage
      shop={shop}
      cities={cities.map((c) => ({ id: c.id, name: c.name, province: c.province }))}
      created={sp.created === "1"}
      ownerEmail={ownerEmail}
      invite={invite}
    />
  );
}
