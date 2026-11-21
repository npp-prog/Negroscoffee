import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Download, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminCounts, listSubmissions } from "@/lib/db";
import { SHOP_TYPE_META, SHOP_TYPES } from "@/lib/categories";

export const metadata: Metadata = { title: "Dashboard" };

const KIND_LABEL = { new_shop: "New shop", claim: "Claim", correction: "Correction" } as const;

function Stat({
  label,
  value,
  href,
  accent,
}: {
  label: string;
  value: number;
  href: string;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-1 rounded-[20px] border bg-surface p-5 shadow-soft transition-shadow hover:shadow-float"
    >
      <span className="text-[13px] font-medium text-muted-foreground">{label}</span>
      <span className={`text-3xl font-semibold tabular ${accent && value > 0 ? "text-crema" : ""}`}>
        {value}
      </span>
    </Link>
  );
}

export default async function AdminDashboard() {
  const db = await getServerSupabase();
  const [counts, pending] = await Promise.all([
    getAdminCounts(db),
    listSubmissions(db, { status: "pending", limit: 6 }),
  ]);
  const pendingTotal = counts.pending.new_shop + counts.pending.claim + counts.pending.correction;
  const published = counts.shops.published || 1;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-semibold">Dashboard</h1>
        <Button asChild variant="crema">
          <Link href="/admin/shops/new">
            <Plus /> New shop
          </Link>
        </Button>
      </div>

      <section aria-labelledby="shops-h" className="flex flex-col gap-3">
        <h2 id="shops-h" className="text-lg font-semibold">
          Shops
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat
            label="Published"
            value={counts.shops.published}
            href="/admin/shops?status=published"
          />
          <Stat label="Drafts" value={counts.shops.draft} href="/admin/shops?status=draft" />
          <Stat label="Hidden" value={counts.shops.hidden} href="/admin/shops?status=hidden" />
          <Stat
            label="OSM drafts to review"
            value={counts.shops.imported}
            href="/admin/shops?status=draft"
            accent
          />
        </div>
        <div className="rounded-[20px] border bg-surface p-5 shadow-soft">
          <p className="mb-3 text-[13px] font-medium text-muted-foreground">Published by type</p>
          <div className="flex h-3 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            {SHOP_TYPES.map((t) => (
              <span
                key={t}
                style={{
                  width: `${(counts.publishedByType[t] / published) * 100}%`,
                  backgroundColor: SHOP_TYPE_META[t].colorVar,
                }}
              />
            ))}
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {SHOP_TYPES.map((t) => (
              <li key={t} className="flex items-center gap-2">
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: SHOP_TYPE_META[t].colorVar }}
                  aria-hidden="true"
                />
                {SHOP_TYPE_META[t].label}
                <span className="font-semibold tabular">{counts.publishedByType[t]}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="queue-h" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="queue-h" className="text-lg font-semibold">
            Review queue <span className="text-muted-foreground tabular">({pendingTotal})</span>
          </h2>
          <Link
            href="/admin/submissions"
            className="inline-flex items-center gap-1 text-sm font-medium hover:underline"
          >
            Open queue <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {(Object.keys(KIND_LABEL) as (keyof typeof KIND_LABEL)[]).map((k) => (
            <Stat
              key={k}
              label={`${KIND_LABEL[k]}s`}
              value={counts.pending[k]}
              href={`/admin/submissions?kind=${k}`}
              accent
            />
          ))}
        </div>
        {pending.length > 0 && (
          <ul className="divide-y rounded-[20px] border bg-surface shadow-soft">
            {pending.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/admin/submissions?open=${s.id}`}
                  className="flex min-h-14 items-center gap-3 px-5 py-3 text-sm hover:bg-accent/50"
                >
                  <span className="w-24 shrink-0 text-[12px] font-semibold tracking-wide text-muted-foreground uppercase">
                    {KIND_LABEL[s.kind]}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {s.shop?.name ?? (s.payload.name as string | undefined) ?? "Untitled"}
                  </span>
                  <time
                    className="shrink-0 text-[12px] text-muted-foreground tabular"
                    dateTime={s.createdAt}
                  >
                    {new Date(s.createdAt).toLocaleDateString("en-PH", {
                      month: "short",
                      day: "numeric",
                    })}
                  </time>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
        <Download className="size-4" aria-hidden="true" />
        Import more cafés from OpenStreetMap with{" "}
        <code className="rounded bg-muted px-1.5 py-0.5">npm run import:osm</code>; they arrive as
        drafts here.
      </p>
    </div>
  );
}
