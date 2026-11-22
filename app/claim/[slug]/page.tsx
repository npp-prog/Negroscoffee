import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, ShieldCheck } from "lucide-react";

import { getPrerenderSlugs, getPublicShop } from "@/app/shop/[slug]/data";
import { ClaimForm } from "@/components/forms/claim-form";
import { ClaimSignInHint } from "@/components/forms/claim-sign-in-hint";
import { PageShell } from "@/components/layout/page-shell";

export async function generateStaticParams() {
  return getPrerenderSlugs();
}

export async function generateMetadata({ params }: PageProps<"/claim/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const shop = await getPublicShop(slug);
  return {
    title: shop ? `Claim ${shop.name}` : "Claim a shop",
    robots: { index: false },
  };
}

export default async function ClaimPage({ params }: PageProps<"/claim/[slug]">) {
  const { slug } = await params;
  const shop = await getPublicShop(slug);
  if (!shop) notFound();

  return (
    <PageShell backHref={`/?shop=${shop.slug}`}>
      <div className="flex flex-col gap-8">
        <header className="flex flex-col gap-2">
          <p className="text-sm font-medium text-crema">Claim this shop</p>
          <h1 className="text-3xl font-semibold sm:text-4xl">{shop.name}</h1>
          <p className="text-muted-foreground">
            Verified owners get a badge and can keep their prices, hours and photos up to date.
          </p>
        </header>

        {shop.verifiedAt && (
          <p className="flex items-start gap-2 rounded-xl border bg-surface px-4 py-3 text-sm">
            <BadgeCheck className="mt-0.5 size-4 shrink-0 text-crema" aria-hidden="true" />
            This shop is already verified. If you think that&apos;s a mistake, send a claim anyway
            and we&apos;ll look into it.
          </p>
        )}

        <ul className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
          {[
            "Send your details and proof",
            "We verify, usually within a few days",
            "Update prices, hours and photos yourself",
          ].map((step, i) => (
            <li key={step} className="flex items-start gap-2.5 rounded-2xl border bg-surface p-3">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-crema text-[12px] font-bold text-crema-foreground">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ul>

        <ClaimSignInHint slug={shop.slug} />

        <ClaimForm shop={{ slug: shop.slug, name: shop.name }} />

        <p className="flex items-start gap-2 text-[13px] text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            Your proof photo is stored privately and only our admins can see it. Not the owner but
            something&apos;s wrong?{" "}
            <Link href={`/suggest?shop=${shop.slug}`} className="underline underline-offset-2">
              Suggest an edit
            </Link>
            .
          </span>
        </p>
      </div>
    </PageShell>
  );
}
