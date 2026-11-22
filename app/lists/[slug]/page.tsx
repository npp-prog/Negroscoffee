import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Coffee, MapPin } from "lucide-react";

import { getListPrerenderSlugs, getPublicList } from "../data";
import { PageShell } from "@/components/layout/page-shell";
import { ShareButton } from "@/components/shop/share-button";
import { RatingBadge } from "@/components/shop/stars";
import { TierBadge } from "@/components/shop/tier-badge";
import { TypeChip } from "@/components/shop/type-chip";
import { Button } from "@/components/ui/button";
import { SHOP_TYPE_META } from "@/lib/categories";
import { shopPhotoUrl, type ShopListDetail } from "@/lib/db";
import { SUPABASE_URL } from "@/lib/env";
import { siteUrl } from "@/lib/site";

export async function generateStaticParams() {
  return getListPrerenderSlugs();
}

function describe(list: ShopListDetail) {
  if (list.description) return list.description.slice(0, 160);
  const names = list.items.slice(0, 3).map((i) => i.shop.name);
  return `${list.items.length} coffee shops on Negros Island: ${names.join(", ")}${list.items.length > 3 ? " and more" : ""}.`;
}

export async function generateMetadata({ params }: PageProps<"/lists/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const list = await getPublicList(slug);
  if (!list) return { title: "List not found", robots: { index: false } };
  const description = describe(list);
  return {
    title: list.title,
    description,
    alternates: { canonical: `/lists/${list.slug}` },
    openGraph: { title: list.title, description, type: "article", url: `/lists/${list.slug}` },
    twitter: { card: "summary_large_image", title: list.title, description },
  };
}

/** schema.org ItemList so search engines understand the ranking. */
function jsonLd(list: ShopListDetail, base: string) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: list.title,
    description: describe(list),
    url: `${base}/lists/${list.slug}`,
    itemListElement: list.items.map((i, n) => ({
      "@type": "ListItem",
      position: n + 1,
      url: `${base}/shop/${i.shop.slug}`,
      name: i.shop.name,
    })),
  }).replace(/</g, "\\u003c");
}

export default async function ListPage({ params }: PageProps<"/lists/[slug]">) {
  const { slug } = await params;
  const list = await getPublicList(slug);
  if (!list) notFound();

  return (
    <PageShell backHref="/lists">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(list, siteUrl()) }}
      />
      <article className="flex flex-col gap-8">
        <header className="flex flex-col gap-3">
          <Link href="/lists" className="text-sm font-medium text-crema hover:underline">
            Coffee lists
          </Link>
          <h1 className="text-4xl leading-tight font-semibold text-balance sm:text-5xl">
            {list.title}
          </h1>
          {list.description && (
            <p className="max-w-prose text-lg whitespace-pre-line text-muted-foreground">
              {list.description}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {list.items.length} {list.items.length === 1 ? "shop" : "shops"}
            </span>
            <ShareButton
              path={`/lists/${list.slug}`}
              title={list.title}
              text={`${list.title} on Kape Negros`}
            />
          </div>
        </header>

        <ol className="flex flex-col gap-4">
          {list.items.map(({ shop, note }, i) => (
            <li
              key={shop.id}
              className="flex gap-4 rounded-[20px] border bg-surface p-3 shadow-soft sm:p-4"
            >
              <span
                className="w-6 shrink-0 pt-1 text-center font-display text-2xl font-semibold text-crema tabular"
                aria-hidden="true"
              >
                {i + 1}
              </span>
              {shop.coverPath ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={shopPhotoUrl(SUPABASE_URL, shop.coverPath, { width: 240, height: 240 })}
                  alt=""
                  loading={i < 3 ? "eager" : "lazy"}
                  className="size-20 shrink-0 rounded-xl bg-muted object-cover sm:size-24"
                />
              ) : (
                <span
                  className="grid size-20 shrink-0 place-items-center rounded-xl text-[var(--pin-foreground)] sm:size-24"
                  style={{ backgroundColor: SHOP_TYPE_META[shop.type].colorVar }}
                  aria-hidden="true"
                >
                  <Coffee className="size-6 opacity-90" />
                </span>
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <h2 className="text-lg leading-tight font-semibold">
                  <Link href={`/shop/${shop.slug}`} className="hover:underline">
                    <span className="sr-only">{i + 1}. </span>
                    {shop.name}
                  </Link>
                </h2>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground">
                  <TypeChip type={shop.type} />
                  <span aria-hidden="true">·</span>
                  <TierBadge tier={shop.priceTier} />
                  {shop.lattePrice != null && (
                    <span className="text-[12px] tabular">
                      ₱{Math.round(shop.lattePrice)}
                      <span className="sr-only"> for a 12 oz latte</span>
                    </span>
                  )}
                  <RatingBadge avg={shop.ratingAvg} count={shop.ratingCount} />
                </div>
                {shop.cityName && (
                  <p className="flex items-center gap-1 text-[13px] text-muted-foreground">
                    <MapPin className="size-3.5" aria-hidden="true" /> {shop.cityName}
                  </p>
                )}
                {note && <p className="mt-1 text-sm">{note}</p>}
              </div>
            </li>
          ))}
        </ol>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/lists">More lists</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/">Explore the map</Link>
          </Button>
        </div>
      </article>
    </PageShell>
  );
}
