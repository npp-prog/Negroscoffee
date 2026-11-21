import type { Metadata } from "next";

import { EditorPage } from "@/components/admin/editor-page";
import { listCities } from "@/lib/db";
import { getServerSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "New shop" };

export default async function NewShopPage() {
  const db = await getServerSupabase();
  const cities = await listCities(db);
  return (
    <EditorPage
      shop={null}
      cities={cities.map((c) => ({ id: c.id, name: c.name, province: c.province }))}
    />
  );
}
