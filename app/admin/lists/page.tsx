import type { Metadata } from "next";
import Link from "next/link";

import { NewListForm } from "@/components/admin/list-editor";
import { StatusBadge } from "@/components/admin/status-badge";
import { adminListLists } from "@/lib/db";
import { getServerSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Coffee lists" };

export default async function AdminListsPage() {
  const db = await getServerSupabase();
  const lists = await adminListLists(db);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold">Coffee lists</h1>
        <p className="text-muted-foreground">
          Hand-picked lists like &ldquo;Best kapihan in Bacolod&rdquo;. Published lists appear at{" "}
          <Link href="/lists" className="underline underline-offset-2" target="_blank">
            /lists
          </Link>{" "}
          and as &ldquo;Featured in&rdquo; on each listed shop.
        </p>
      </div>
      <NewListForm />
      {lists.length === 0 ? (
        <p className="rounded-[20px] border border-dashed p-8 text-center text-muted-foreground">
          No lists yet. Start with a title above.
        </p>
      ) : (
        <ul className="flex flex-col divide-y rounded-[20px] border bg-surface shadow-soft">
          {lists.map((l) => (
            <li key={l.id}>
              <Link
                href={`/admin/lists/${l.id}`}
                className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-accent"
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">{l.title}</span>
                  <span className="text-[13px] text-muted-foreground">
                    {l.count} {l.count === 1 ? "shop" : "shops"} · /lists/{l.slug}
                  </span>
                </span>
                <StatusBadge status={l.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
