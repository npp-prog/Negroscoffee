import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";

import { getCityOptions } from "./data";
import { getPublicShop } from "@/app/shop/[slug]/data";
import { CorrectionForm } from "@/components/forms/correction-form";
import { SuggestForm } from "@/components/forms/suggest-form";
import { PageShell } from "@/components/layout/page-shell";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Suggest a coffee shop",
  description: "Know a coffee shop on Negros that's missing from the map? Tell us about it.",
};

function FormSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="Loading form">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}

/** ?shop=<slug> turns this into "suggest an edit" for that shop. */
async function SuggestContent({
  searchParams,
}: {
  searchParams: PageProps<"/suggest">["searchParams"];
}) {
  const { shop: raw } = await searchParams;
  const slug = typeof raw === "string" ? raw : undefined;
  const shop = slug ? await getPublicShop(slug) : null;

  if (shop) {
    return (
      <>
        <header className="flex flex-col gap-2">
          <p className="text-sm font-medium text-crema">Suggest an edit</p>
          <h1 className="text-3xl font-semibold sm:text-4xl">{shop.name}</h1>
          <p className="text-muted-foreground">
            Prices, hours or details out of date? Tell us what changed and we&apos;ll update the
            listing.
          </p>
        </header>
        <CorrectionForm shop={{ slug: shop.slug, name: shop.name }} />
      </>
    );
  }

  const cities = await getCityOptions();
  return (
    <>
      <header className="flex flex-col gap-2">
        <p className="text-sm font-medium text-crema">Suggest a shop</p>
        <h1 className="text-3xl font-semibold sm:text-4xl">Know a great cup we&apos;re missing?</h1>
        <p className="text-muted-foreground">
          Tell us about it. Only the name is required; every extra detail helps us verify it faster.
          Own the shop? Find it on the map and use{" "}
          <span className="font-medium text-foreground">Own this shop?</span> instead.
        </p>
      </header>
      <SuggestForm cities={cities} />
      <p className="text-[13px] text-muted-foreground">
        Suggestions are reviewed before they appear. See{" "}
        <Link href="/about" className="underline underline-offset-2">
          how listings work
        </Link>
        .
      </p>
    </>
  );
}

export default function SuggestPage({ searchParams }: PageProps<"/suggest">) {
  return (
    <PageShell>
      <div className="flex flex-col gap-8">
        <Suspense fallback={<FormSkeleton />}>
          <SuggestContent searchParams={searchParams} />
        </Suspense>
      </div>
    </PageShell>
  );
}
