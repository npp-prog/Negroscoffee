import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  Coffee,
  ExternalLink,
  Globe,
  MapPin,
  Navigation,
  Pencil,
  Phone,
  Store,
} from "lucide-react";

import { getPrerenderSlugs, getPublicShop } from "./data";
import { CupIllustration } from "@/components/brand/cup-illustration";
import { PageShell } from "@/components/layout/page-shell";
import { HoursTable } from "@/components/shop/hours-table";
import { LiveOpenStatus } from "@/components/shop/live-open-status";
import { MenuPrices } from "@/components/shop/menu-prices";
import { PhotoCarousel } from "@/components/shop/photo-carousel";
import { ReviewsSection } from "@/components/shop/reviews-section";
import { SaveButtons } from "@/components/shop/save-buttons";
import { RatingBadge } from "@/components/shop/stars";
import { TierBadge } from "@/components/shop/tier-badge";
import { TypeChip } from "@/components/shop/type-chip";
import { Button } from "@/components/ui/button";
import { PRICE_TIER_META, PROVINCE_LABEL, SHOP_TYPE_META } from "@/lib/categories";
import { shopPhotoUrl, WEEKDAYS, type ShopDetail } from "@/lib/db";
import { SUPABASE_URL } from "@/lib/env";
import { siteUrl } from "@/lib/site";

export async function generateStaticParams() {
  return getPrerenderSlugs();
}

function placeLine(shop: ShopDetail) {
  const province = shop.province ? PROVINCE_LABEL[shop.province] : null;
  return [shop.cityName, province].filter(Boolean).join(", ");
}

function describe(shop: ShopDetail) {
  if (shop.description) return shop.description.slice(0, 160);
  const type = SHOP_TYPE_META[shop.type].label.toLowerCase();
  const tier = PRICE_TIER_META[shop.priceTier].label.toLowerCase();
  const where = shop.cityName ? ` in ${shop.cityName}` : " on Negros Island";
  const latte = shop.lattePrice != null ? ` Latte ₱${Math.round(shop.lattePrice)}.` : "";
  return `${shop.name} is a ${tier} ${type} coffee shop${where}.${latte}`;
}

export async function generateMetadata({ params }: PageProps<"/shop/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const shop = await getPublicShop(slug);
  if (!shop) return { title: "Shop not found", robots: { index: false } };
  const title = shop.cityName ? `${shop.name}, ${shop.cityName}` : shop.name;
  const description = describe(shop);
  return {
    title,
    description,
    alternates: { canonical: `/shop/${shop.slug}` },
    openGraph: { title, description, type: "website", url: `/shop/${shop.slug}` },
    twitter: { card: "summary_large_image", title, description },
  };
}

/** schema.org CafeOrCoffeeShop for search engines. */
function jsonLd(shop: ShopDetail, base: string) {
  const dayName: Record<string, string> = {
    mon: "Monday",
    tue: "Tuesday",
    wed: "Wednesday",
    thu: "Thursday",
    fri: "Friday",
    sat: "Saturday",
    sun: "Sunday",
  };
  const hours = shop.hours
    ? WEEKDAYS.flatMap((d) =>
        (shop.hours?.[d] ?? []).map((r) => ({
          "@type": "OpeningHoursSpecification",
          dayOfWeek: dayName[d],
          opens: r.open,
          closes: r.close === "24:00" ? "23:59" : r.close,
        })),
      )
    : undefined;
  const data = {
    "@context": "https://schema.org",
    "@type": "CafeOrCoffeeShop",
    name: shop.name,
    url: `${base}/shop/${shop.slug}`,
    description: describe(shop),
    priceRange: PRICE_TIER_META[shop.priceTier].symbol,
    servesCuisine: "Coffee",
    geo: { "@type": "GeoCoordinates", latitude: shop.lat, longitude: shop.lng },
    address: {
      "@type": "PostalAddress",
      streetAddress: shop.address ?? undefined,
      addressLocality: shop.cityName ?? undefined,
      addressRegion: shop.province ? PROVINCE_LABEL[shop.province] : undefined,
      addressCountry: "PH",
    },
    telephone: shop.phone ?? undefined,
    sameAs: [shop.facebookUrl, shop.instagramUrl, shop.website].filter(Boolean),
    openingHoursSpecification: hours?.length ? hours : undefined,
    aggregateRating:
      shop.ratingCount > 0 && shop.ratingAvg != null
        ? {
            "@type": "AggregateRating",
            ratingValue: shop.ratingAvg,
            reviewCount: shop.ratingCount,
            bestRating: 5,
            worstRating: 1,
          }
        : undefined,
  };
  // Escape "<" so the JSON can't close the script tag.
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function externalHref(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export default async function ShopPage({ params }: PageProps<"/shop/[slug]">) {
  const { slug } = await params;
  const shop = await getPublicShop(slug);
  if (!shop) notFound();

  const photos = shop.photos.map((p, i) => ({
    id: p.id,
    src: shopPhotoUrl(SUPABASE_URL, p.storage_path, { width: 1200, height: 800 }),
    alt: p.caption ?? `${shop.name} photo ${i + 1}`,
  }));
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${shop.lat},${shop.lng}`;
  const tier = PRICE_TIER_META[shop.priceTier];
  const place = placeLine(shop);

  const links = [
    shop.phone && { href: `tel:${shop.phone.replace(/\s+/g, "")}`, label: shop.phone, icon: Phone },
    shop.facebookUrl && {
      href: externalHref(shop.facebookUrl),
      label: "Facebook",
      icon: ExternalLink,
    },
    shop.instagramUrl && {
      href: externalHref(shop.instagramUrl),
      label: "Instagram",
      icon: ExternalLink,
    },
    shop.website && { href: externalHref(shop.website), label: "Website", icon: Globe },
  ].filter(Boolean) as { href: string; label: string; icon: typeof Phone }[];

  return (
    <PageShell backHref={`/?shop=${shop.slug}`} wide>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(shop, siteUrl()) }}
      />

      <article className="flex flex-col gap-8">
        {photos.length > 0 ? (
          <PhotoCarousel photos={photos} />
        ) : (
          <div
            className="relative grid aspect-[16/7] place-items-center overflow-hidden rounded-[20px]"
            style={{
              background: `linear-gradient(135deg, color-mix(in oklab, ${SHOP_TYPE_META[shop.type].colorVar} 22%, var(--surface)), var(--surface))`,
            }}
          >
            <CupIllustration className="w-32 sm:w-40" />
            <p className="absolute bottom-3 text-[13px] text-muted-foreground">No photos yet</p>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex min-w-0 flex-col gap-8">
            <header className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
                <TypeChip type={shop.type} className="text-[13px]" />
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1.5 text-[13px]">
                  <TierBadge tier={shop.priceTier} className="text-[13px]" />
                  {tier.label}
                </span>
                {shop.verifiedAt && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1 text-[13px] font-medium text-foreground">
                      <BadgeCheck className="size-4 text-crema" aria-hidden="true" /> Verified
                    </span>
                  </>
                )}
              </div>
              <h1 className="text-4xl leading-tight font-semibold text-balance sm:text-5xl">
                {shop.name}
              </h1>
              {place && (
                <p className="flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="size-4 shrink-0" aria-hidden="true" />
                  {shop.address ? `${shop.address}, ${place}` : place}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <LiveOpenStatus hours={shop.hours} />
                {shop.ratingCount > 0 && (
                  <a href="#reviews" className="rounded-full hover:underline">
                    <RatingBadge
                      avg={shop.ratingAvg}
                      count={shop.ratingCount}
                      className="text-sm"
                    />
                  </a>
                )}
              </div>
            </header>

            <div className="flex flex-wrap gap-2">
              <Button asChild variant="crema">
                <a href={directions} target="_blank" rel="noopener noreferrer">
                  <Navigation /> Directions
                </a>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/?shop=${shop.slug}`}>
                  <MapPin /> View on map
                </Link>
              </Button>
              <SaveButtons shopId={shop.id} slug={shop.slug} />
            </div>

            {shop.description && (
              <section className="flex flex-col gap-2">
                <h2 className="text-xl font-semibold">About</h2>
                <p className="max-w-prose whitespace-pre-line text-muted-foreground">
                  {shop.description}
                </p>
              </section>
            )}

            <section className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="text-xl font-semibold">Menu prices</h2>
                {shop.lattePrice != null && (
                  <p className="text-sm text-muted-foreground">
                    12 oz latte{" "}
                    <span className="font-semibold text-foreground tabular">
                      ₱{Math.round(shop.lattePrice)}
                    </span>
                  </p>
                )}
              </div>
              {shop.menu.length > 0 ? (
                <div className="rounded-[20px] border bg-surface p-5 shadow-soft">
                  <MenuPrices items={shop.menu} />
                </div>
              ) : (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Coffee className="size-4" aria-hidden="true" />
                  No menu yet. Been here? Help by suggesting prices.
                </p>
              )}
            </section>

            <ReviewsSection
              shopId={shop.id}
              slug={shop.slug}
              shopName={shop.name}
              initialReviews={shop.reviews}
              initialAvg={shop.ratingAvg}
              initialCount={shop.ratingCount}
            />
          </div>

          <aside className="flex flex-col gap-4">
            <section className="rounded-[20px] border bg-surface p-5 shadow-soft">
              <h2 className="mb-2 text-lg font-semibold">Hours</h2>
              {shop.hours && Object.keys(shop.hours).length > 0 ? (
                <HoursTable hours={shop.hours} />
              ) : (
                <p className="text-sm text-muted-foreground">Hours not listed yet.</p>
              )}
              <p className="mt-2 text-[12px] text-muted-foreground">Philippine time</p>
            </section>

            {links.length > 0 && (
              <section className="rounded-[20px] border bg-surface p-5 shadow-soft">
                <h2 className="mb-2 text-lg font-semibold">Contact</h2>
                <ul className="flex flex-col">
                  {links.map(({ href, label, icon: Icon }) => (
                    <li key={href}>
                      <a
                        href={href}
                        {...(href.startsWith("http")
                          ? { target: "_blank", rel: "noopener noreferrer" }
                          : {})}
                        className="-mx-2 flex min-h-11 items-center gap-3 rounded-xl px-2 text-sm hover:bg-accent"
                      >
                        <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
                        <span className="truncate">{label}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="flex flex-col gap-2 rounded-[20px] border border-dashed p-5">
              <h2 className="text-sm font-semibold">Something off?</h2>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/suggest?shop=${shop.slug}`}>
                    <Pencil /> Suggest an edit
                  </Link>
                </Button>
                {!shop.verifiedAt && (
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/claim/${shop.slug}`}>
                      <Store /> Own this shop?
                    </Link>
                  </Button>
                )}
              </div>
            </section>
          </aside>
        </div>

        {shop.osmId && (
          <p className="text-[12px] text-muted-foreground">
            Some details from{" "}
            <a
              href={`https://www.openstreetmap.org/${shop.osmId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              © OpenStreetMap contributors
            </a>{" "}
            (ODbL).
          </p>
        )}
      </article>
    </PageShell>
  );
}
