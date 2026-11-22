import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Download, Plus } from "lucide-react";

import { LaunchChecklist } from "@/components/admin/launch-checklist";
import { Button } from "@/components/ui/button";
import { CONTACT_EMAIL } from "@/lib/env";
import { launchChecklist } from "@/lib/launch";
import { siteUrl } from "@/lib/site";
import { getServerSupabase } from "@/lib/supabase/server";
import {
  countPendingPhotos,
  listDemoShopSlugs,
  listTopShops,
  type TopShop,
  describeShopEdit,
  getAdminCounts,
  listRecentShopEdits,
  listSubmissions,
} from "@/lib/db";
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
  const [counts, pending, edits, photoCount, demoSlugs, topShops] = await Promise.all([
    getAdminCounts(db),
    listSubmissions(db, { status: "pending", limit: 6 }),
    listRecentShopEdits(db, 8).catch(() => []),
    countPendingPhotos(db).catch(() => 0),
    listDemoShopSlugs(db).catch(() => [] as string[]),
    listTopShops(db, 7, 5).catch(() => [] as TopShop[]),
  ]);
  const launch = launchChecklist({
    demoShops: demoSlugs.length,
    publishedShops: counts.shops.published,
    hasMapKey: !!process.env.NEXT_PUBLIC_MAPTILER_KEY,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasContactEmail: !!CONTACT_EMAIL,
    hasEmail: !!process.env.RESEND_API_KEY,
    siteUrl: siteUrl(),
  });
  const launchReady = launch.every((i) => i.optional || i.done);
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

      {!launchReady && <LaunchChecklist items={launch} />}

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
            href="/admin/review"
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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(Object.keys(KIND_LABEL) as (keyof typeof KIND_LABEL)[]).map((k) => (
            <Stat
              key={k}
              label={`${KIND_LABEL[k]}s`}
              value={counts.pending[k]}
              href={`/admin/submissions?kind=${k}`}
              accent
            />
          ))}
          <Stat label="Visitor photos" value={photoCount} href="/admin/photos" accent />
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

      <section aria-labelledby="edits-h" className="flex flex-col gap-3">
        <h2 id="edits-h" className="text-lg font-semibold">
          Recent owner edits
        </h2>
        {edits.length === 0 ? (
          <p className="text-sm text-muted-foreground">No owner edits yet.</p>
        ) : (
          <ul className="divide-y rounded-[20px] border bg-surface shadow-soft">
            {edits.map((e) => (
              <li key={e.id}>
                <Link
                  href={e.shop ? `/admin/shops/${e.shop.id}` : "/admin/shops"}
                  className="flex min-h-14 items-center gap-3 px-5 py-3 text-sm hover:bg-accent/50"
                >
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{e.shop?.name ?? "Deleted shop"}</span>
                    <span className="text-muted-foreground"> · {describeShopEdit(e.changes)}</span>
                    {e.editor && <span className="text-muted-foreground"> · by {e.editor}</span>}
                  </span>
                  <time
                    className="shrink-0 text-[12px] text-muted-foreground tabular"
                    dateTime={e.createdAt}
                  >
                    {new Date(e.createdAt).toLocaleString("en-PH", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                      timeZone: "Asia/Manila",
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
      <section aria-labelledby="top-h" className="flex flex-col gap-3">
        <h2 id="top-h" className="text-lg font-semibold">
          Most viewed · last 7 days
        </h2>
        {topShops.length === 0 ? (
          <p className="text-sm text-muted-foreground">No visits counted yet.</p>
        ) : (
          <ol className="flex flex-col divide-y rounded-[20px] border bg-surface shadow-soft">
            {topShops.map((t, i) => (
              <li key={t.shopId}>
                <Link
                  href={`/owner/shops/${t.shopId}`}
                  className="flex min-h-12 items-center gap-3 px-4 py-2 text-sm hover:bg-accent"
                >
                  <span className="w-5 text-muted-foreground tabular">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{t.name}</span>
                  <span className="text-muted-foreground tabular">
                    {t.views} views · {t.directions} directions
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>

      {launchReady && <LaunchChecklist items={launch} />}
    </div>
  );
}
