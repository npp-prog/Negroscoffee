import { Suspense } from "react";
import type { Metadata } from "next";

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
          <p className="text-muted-foreground">For Kape Negros admins and verified shop owners.</p>
        </header>
        <Suspense fallback={<Skeleton className="h-80 w-full rounded-[20px]" />}>
          <LoginForm />
        </Suspense>
      </div>
    </PageShell>
  );
}
