import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { ListEditor } from "@/components/admin/list-editor";
import { getAdminList } from "@/lib/db";
import { getServerSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Edit list" };

export default async function AdminListPage({ params }: PageProps<"/admin/lists/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = await getServerSupabase();
  const list = await getAdminList(db, id);
  if (!list) notFound();
  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/admin/lists"
        className="inline-flex items-center gap-1.5 self-start text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> All lists
      </Link>
      <ListEditor
        list={{
          id: list.id,
          title: list.title,
          slug: list.slug,
          description: list.description ?? "",
          status: list.status === "published" ? "published" : "draft",
          sortOrder: list.sort_order,
          items: list.items,
        }}
      />
    </div>
  );
}
