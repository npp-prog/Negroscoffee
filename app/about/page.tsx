import type { Metadata } from "next";
import Link from "next/link";

import { PageShell } from "@/components/layout/page-shell";
import { PRICE_TIERS, PRICE_TIER_META, SHOP_TYPES, SHOP_TYPE_META } from "@/lib/categories";

export const metadata: Metadata = {
  title: "About",
  description: "How Kape Negros maps and categorizes coffee shops on Negros Island.",
};

export default function AboutPage() {
  return (
    <PageShell>
      <article className="flex flex-col gap-10">
        <header className="flex flex-col gap-3">
          <p className="text-sm font-medium text-crema">About</p>
          <h1 className="text-4xl font-semibold sm:text-5xl">Every cup on Negros, on one map.</h1>
          <p className="max-w-prose text-lg text-muted-foreground">
            Kape Negros lists coffee shops across Negros Occidental and Negros Oriental — from
            Bacolod and Silay to Dumaguete, Dauin and Sipalay — so you can find the right cup by
            price and style.
          </p>
        </header>

        <section className="flex flex-col gap-4">
          <h2 className="text-2xl font-semibold">How price tiers work</h2>
          <p className="text-muted-foreground">
            Every shop is placed on the same yardstick: the price of a regular 12 oz hot latte.
          </p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {PRICE_TIERS.map((tier) => (
              <li
                key={tier}
                className="flex items-center gap-4 rounded-2xl border bg-surface p-4 shadow-soft"
              >
                <span className="w-14 text-xl font-semibold text-crema tabular">
                  {PRICE_TIER_META[tier].symbol}
                </span>
                <span className="flex flex-col">
                  <span className="font-medium">{PRICE_TIER_META[tier].label}</span>
                  <span className="text-sm text-muted-foreground tabular">
                    {PRICE_TIER_META[tier].range}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-2xl font-semibold">Shop types</h2>
          <ul className="flex flex-col gap-3">
            {SHOP_TYPES.map((type) => (
              <li key={type} className="flex items-start gap-3">
                <span
                  className="mt-1.5 size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: SHOP_TYPE_META[type].colorVar }}
                  aria-hidden="true"
                />
                <span>
                  <span className="font-medium">{SHOP_TYPE_META[type].label}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    — {SHOP_TYPE_META[type].description}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-2xl font-semibold">Where the data comes from</h2>
          <p className="text-muted-foreground">
            Listings start from{" "}
            <a
              className="font-medium text-foreground underline underline-offset-4"
              href="https://www.openstreetmap.org/copyright"
            >
              OpenStreetMap
            </a>{" "}
            contributors (© OpenStreetMap, ODbL), then every shop is checked by hand before it is
            published. Owners and coffee lovers can{" "}
            <Link
              className="font-medium text-foreground underline underline-offset-4"
              href="/suggest"
            >
              suggest a shop
            </Link>{" "}
            or claim their listing.
          </p>
        </section>

        <p className="text-sm text-muted-foreground">
          <Link className="underline underline-offset-4 hover:text-foreground" href="/privacy">
            Privacy &amp; community rules
          </Link>
        </p>
      </article>
    </PageShell>
  );
}
