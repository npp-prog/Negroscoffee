import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut, ShieldAlert } from "lucide-react";

import { signOutAction } from "@/app/login/actions";
import { Logo } from "@/components/brand/logo";
import { AdminNav } from "@/components/admin/admin-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getViewer } from "@/lib/admin-server";
import { hasSupabaseEnv } from "@/lib/env";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin · Kape Negros" },
  robots: { index: false, follow: false },
};

/** Renders children only for admins; everyone else is sent to sign in or told why not. */
async function AdminGate({ children }: { children: React.ReactNode }) {
  if (!hasSupabaseEnv()) {
    return (
      <p className="text-muted-foreground">
        Supabase isn&apos;t configured. Add the keys to .env.local.
      </p>
    );
  }
  const { user, role } = await getViewer();
  if (!user) redirect("/login?next=/admin");
  if (role !== "admin") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
        <ShieldAlert className="size-8 text-crema" aria-hidden="true" />
        <h1 className="text-2xl font-semibold">Admins only</h1>
        <p className="text-muted-foreground">
          You&apos;re signed in as {user.email}, which doesn&apos;t have admin access. Ask an
          existing admin to grant it.
        </p>
        <form action={signOutAction}>
          <Button type="submit" variant="outline">
            <LogOut /> Sign out
          </Button>
        </form>
      </div>
    );
  }
  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-3 text-[13px] text-muted-foreground">
        <span className="truncate">Signed in as {user.email}</span>
        <form action={signOutAction}>
          <Button type="submit" variant="ghost" size="sm">
            <LogOut /> Sign out
          </Button>
        </form>
      </div>
      {children}
    </>
  );
}

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b glass">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <Link href="/" aria-label="Kape Negros home" className="shrink-0 rounded-lg">
            <Logo />
          </Link>
          <Suspense fallback={<AdminNav static />}>
            <AdminNav />
          </Suspense>
          <ThemeToggle variant="ghost" className="ml-auto" />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <Suspense
          fallback={
            <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-40 w-full rounded-[20px]" />
            </div>
          }
        >
          <AdminGate>{children}</AdminGate>
        </Suspense>
      </main>
    </div>
  );
}
