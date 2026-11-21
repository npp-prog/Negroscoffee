import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";

import { ShopsTable } from "@/components/admin/shops-table";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { SHOP_TYPES, SHOP_TYPE_META, type ShopType } from "@/lib/categories";
import { listAdminShops, type ShopStatus } from "@/lib/db";
import { getServerSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Shops" };

const STATUSES: ShopStatus[] = ["draft", "published", "hidden"];
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

export default async function AdminShopsPage({ searchParams }: PageProps<"/admin/shops">) {
  const sp = await searchParams;
  const q = one(sp.q)?.slice(0, 80) ?? "";
  const status = STATUSES.find((s) => s === one(sp.status));
  const typeParam = one(sp.type);
  const type = typeParam === "none" ? "none" : SHOP_TYPES.find((t) => t === typeParam);
  const page = Math.max(1, Number(one(sp.page)) || 1);

  const db = await getServerSupabase();
  const { rows, total, pageSize } = await listAdminShops(db, { q, status, type, page });
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const href = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (type) params.set("type", type);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return `/admin/shops${s ? `?${s}` : ""}`;
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-semibold">
          Shops <span className="text-lg text-muted-foreground tabular">({total})</span>
        </h1>
        <Button asChild variant="crema">
          <Link href="/admin/shops/new">
            <Plus /> New shop
          </Link>
        </Button>
      </div>

      <form method="get" className="grid gap-2 sm:grid-cols-[1fr_160px_160px_auto]" role="search">
        <label className="sr-only" htmlFor="q">
          Search shops
        </label>
        <Input id="q" name="q" defaultValue={q} placeholder="Search by name" type="search" />
        <label className="sr-only" htmlFor="status">
          Status
        </label>
        <Select id="status" name="status" defaultValue={status ?? ""}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s[0].toUpperCase() + s.slice(1)}
            </option>
          ))}
        </Select>
        <label className="sr-only" htmlFor="type">
          Type
        </label>
        <Select id="type" name="type" defaultValue={type ?? ""}>
          <option value="">All types</option>
          {SHOP_TYPES.map((t: ShopType) => (
            <option key={t} value={t}>
              {SHOP_TYPE_META[t].label}
            </option>
          ))}
          <option value="none">No type yet</option>
        </Select>
        <Button type="submit" variant="outline" className="h-12">
          <Search /> Filter
        </Button>
      </form>

      {rows.length ? (
        <ShopsTable rows={rows} />
      ) : (
        <p className="rounded-[20px] border border-dashed p-10 text-center text-muted-foreground">
          No shops match.
        </p>
      )}

      {pages > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-center gap-2 text-sm">
          {page > 1 ? (
            <Button asChild variant="outline" size="sm">
              <Link href={href(page - 1)} rel="prev">
                <ChevronLeft /> Previous
              </Link>
            </Button>
          ) : null}
          <span className="px-2 text-muted-foreground tabular">
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Button asChild variant="outline" size="sm">
              <Link href={href(page + 1)} rel="next">
                Next <ChevronRight />
              </Link>
            </Button>
          ) : null}
        </nav>
      )}
    </div>
  );
}
