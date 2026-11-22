import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";
import { PageShell } from "@/components/layout/page-shell";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default function LoginPage() {
  return (
    <PageShell>
      <div className="mx-auto flex max-w-md flex-col gap-6">
        <header className="flex flex-col gap-2 text-center">
          <h1 className="text-3xl font-semibold">Sign in</h1>
          <p className="text-muted-foreground">
            Save favorite shops, write reviews and add photos. Shop owners and admins sign in here
            too.
          </p>
        </header>
        <Suspense fallback={<Skeleton className="h-80 w-full rounded-[20px]" />}>
          <LoginForm />
        </Suspense>
        <p className="text-center text-[13px] text-muted-foreground">
          By signing in you agree to our{" "}
          <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground">
            privacy &amp; community rules
          </Link>
          .
        </p>
      </div>
    </PageShell>
  );
}
