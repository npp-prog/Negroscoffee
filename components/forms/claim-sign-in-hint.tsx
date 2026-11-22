"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogIn, UserCheck } from "lucide-react";

import { hasSupabaseEnv } from "@/lib/env";
import { getBrowserSupabase } from "@/lib/supabase/browser";

/**
 * Claims are linked to the claimant's account on approval, which needs them signed in.
 * Reads the local session only (no network), after mount.
 */
export function ClaimSignInHint({ slug }: { slug: string }) {
  const [email, setEmail] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (!hasSupabaseEnv()) return;
    getBrowserSupabase()
      .auth.getSession()
      .then(({ data }) => setEmail(data.session?.user.email ?? null))
      .catch(() => setEmail(null));
  }, []);

  if (email === undefined) return null;
  if (email) {
    return (
      <p className="flex items-start gap-2 rounded-xl border bg-surface px-4 py-3 text-sm">
        <UserCheck className="mt-0.5 size-4 shrink-0 text-crema" aria-hidden="true" />
        <span>
          Signed in as <span className="font-medium">{email}</span>. Once approved, you&apos;ll
          manage this shop from <span className="font-medium">My shop</span> with this account.
        </span>
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-crema/40 bg-crema/10 px-4 py-3 text-sm sm:flex-row sm:items-center">
      <p className="flex-1">
        <span className="font-semibold">Sign in first</span> so we can link the shop to your account
        and you can update prices, hours and photos yourself after approval.
      </p>
      <Link
        href={`/login?next=/claim/${slug}`}
        className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-4 font-medium text-primary-foreground"
      >
        <LogIn className="size-4" aria-hidden="true" /> Sign in
      </Link>
    </div>
  );
}
