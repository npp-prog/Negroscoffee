import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut, Store } from "lucide-react";

import { signOutAction } from "@/app/login/actions";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getViewer } from "@/lib/admin-server";
import { hasSupabaseEnv } from "@/lib/env";

export const metadata: Metadata = {
  title: { default: "My shop", template: "%s · My shop · Kape Negros" },
  robots: { index: false, follow: false },
};

/** Signed-in owners (and admins) only. Others are told how to get access. */
async function OwnerGate({ children }: { children: React.ReactNode }) {
  if (!hasSupabaseEnv()) {
    return (
      <p className="text-muted-foreground">
        Supabase isn&apos;t configured. Add the keys to .env.local.
      </p>
    );
  }
  const { user, role } = await getViewer();
  if (!user) redirect("/login?next=/owner");
  if (role !== "owner" && role !== "admin") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
        <Store className="size-8 text-crema" aria-hidden="true" />
        <h1 className="text-2xl font-semibold">No shop linked yet</h1>
        <p className="text-muted-foreground">
          You&apos;re signed in as {user.email}. To manage a shop, find it on the map, tap{" "}
          <span className="font-medium text-foreground">Own this shop?</span> and send a claim while
          signed in. We&apos;ll link it to this account once it&apos;s verified.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild variant="crema">
            <Link href="/">Find my shop</Link>
          </Button>
          <form action={signOutAction}>
            <Button type="submit" variant="outline">
              <LogOut /> Sign out
            </Button>
          </form>
        </div>
      </div>
    );
  }
  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-3 text-[13px] text-muted-foreground">
        <span className="truncate">Signed in as {user.email}</span>
        <div className="flex items-center gap-1">
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
      </div>
      {children}
    </>
  );
}

export default function OwnerLayout({ children }: LayoutProps<"/owner">) {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b glass">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-4 px-4">
          <Link href="/" aria-label="Kape Negros home" className="shrink-0 rounded-lg">
            <Logo />
          </Link>
          <Link
            href="/owner"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            My shop
          </Link>
          <ThemeToggle variant="ghost" className="ml-auto" />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
        <Suspense
          fallback={
            <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-40 w-full rounded-[20px]" />
            </div>
          }
        >
          <OwnerGate>{children}</OwnerGate>
        </Suspense>
      </main>
    </div>
  );
}
