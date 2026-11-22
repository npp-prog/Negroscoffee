import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Check, Heart, LogOut } from "lucide-react";

import { signOutAction } from "@/app/login/actions";
import { PageShell } from "@/components/layout/page-shell";
import { DisplayNameForm } from "@/components/saved/display-name-form";
import { RatingBadge } from "@/components/shop/stars";
import { TierBadge } from "@/components/shop/tier-badge";
import { TypeChip } from "@/components/shop/type-chip";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getViewer } from "@/lib/admin-server";
import { getProfileRole, getShopCardsByIds, listSavedShopIds, type ShopCard } from "@/lib/db";
import { hasSupabaseEnv } from "@/lib/env";

export const metadata: Metadata = { title: "Saved", robots: { index: false } };

function ShopList({ shops, empty }: { shops: ShopCard[]; empty: string }) {
  if (shops.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="flex flex-col gap-2">
      {shops.map((s) => (
        <li key={s.id}>
          <Link
            href={`/shop/${s.slug}`}
            className="flex flex-col gap-1 rounded-2xl border bg-surface p-4 shadow-soft hover:shadow-float"
          >
            <span className="font-semibold">{s.name}</span>
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
              <TypeChip type={s.type} />
              <TierBadge tier={s.priceTier} />
              <RatingBadge avg={s.ratingAvg} count={s.ratingCount} />
              {s.cityName && <span className="text-[12px]">{s.cityName}</span>}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

async function SavedContent() {
  if (!hasSupabaseEnv())
    return <p className="text-muted-foreground">Supabase isn&apos;t configured.</p>;
  const { db, user, role } = await getViewer();
  if (!user) redirect("/login?next=/saved");
  const [ids, profile] = await Promise.all([
    listSavedShopIds(db, user.id),
    getProfileRole(db, user.id),
  ]);
  const [favorites, visited] = await Promise.all([
    getShopCardsByIds(db, ids.favorite),
    getShopCardsByIds(db, ids.visited),
  ]);
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Saved</h1>
          <p className="text-sm text-muted-foreground">Signed in as {user.email}</p>
        </div>
        <div className="flex gap-1">
          {role === "owner" && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/owner">My shop</Link>
            </Button>
          )}
          {role === "admin" && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin">Admin</Link>
            </Button>
          )}
          <form action={signOutAction}>
            <Button type="submit" variant="ghost" size="sm">
              <LogOut /> Sign out
            </Button>
          </form>
        </div>
      </header>
      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Heart
            className="size-5 fill-[var(--type-chain)] text-[var(--type-chain)]"
            aria-hidden="true"
          />{" "}
          Favorites
        </h2>
        <ShopList
          shops={favorites}
          empty="Tap “Add to favorites” on a shop page to keep it here."
        />
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Check className="size-5 text-[var(--type-kapihan)]" aria-hidden="true" /> Visited
        </h2>
        <ShopList shops={visited} empty="Mark shops with “Been here” to track your coffee trail." />
      </section>
      <section className="rounded-[20px] border bg-surface p-5 shadow-soft">
        <DisplayNameForm initial={profile?.display_name ?? ""} />
      </section>
    </div>
  );
}

export default function SavedPage() {
  return (
    <PageShell>
      <Suspense fallback={<Skeleton className="h-64 w-full rounded-[20px]" />}>
        <SavedContent />
      </Suspense>
    </PageShell>
  );
}
