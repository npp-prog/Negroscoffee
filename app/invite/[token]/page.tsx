import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Clock, Store } from "lucide-react";

import { PageShell } from "@/components/layout/page-shell";
import { AcceptInvite } from "@/components/owner/accept-invite";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getViewer } from "@/lib/admin-server";
import { getClaimInviteInfo } from "@/lib/db";
import { hasSupabaseEnv } from "@/lib/env";

export const metadata: Metadata = { title: "Shop owner invite", robots: { index: false } };

const PROBLEM: Record<string, { title: string; body: string }> = {
  used: {
    title: "This invite was already used",
    body: "Sign in with the account that accepted it, or ask us for a new link.",
  },
  expired: {
    title: "This invite has expired",
    body: "Invites are valid for 14 days. Ask us for a new link.",
  },
  revoked: { title: "This invite was cancelled", body: "Ask us for a new link." },
  owned: {
    title: "This shop already has an owner",
    body: "If you think that's a mistake, send a claim from the shop page.",
  },
};

async function InviteContent({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!hasSupabaseEnv())
    return <p className="text-muted-foreground">Supabase isn&apos;t configured.</p>;
  const { db, user } = await getViewer();
  const info =
    token.length >= 20 && token.length <= 100
      ? await getClaimInviteInfo(db, token).catch(() => null)
      : null;

  if (!info) {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold">This invite link isn&apos;t valid</h1>
        <p className="text-muted-foreground">
          Check that you copied the whole link, or ask us for a new one.
        </p>
      </div>
    );
  }
  const problem = info.status !== "valid" ? PROBLEM[info.status] : null;
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-medium text-crema">Shop owner invite</p>
        <h1 className="text-3xl font-semibold sm:text-4xl">{info.shopName}</h1>
      </header>
      {problem ? (
        <div className="flex flex-col items-start gap-3 rounded-[20px] border bg-surface p-5 shadow-soft">
          <h2 className="flex items-center gap-2 font-semibold">
            <Clock className="size-5 text-crema" aria-hidden="true" /> {problem.title}
          </h2>
          <p className="text-sm text-muted-foreground">{problem.body}</p>
          <Button asChild variant="outline" size="sm">
            <Link href={`/shop/${info.shopSlug}`}>View the shop page</Link>
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-5 rounded-[20px] border bg-surface p-5 shadow-soft sm:p-6">
          <p>
            You&apos;ve been invited to manage this shop on Kape Negros. As the verified owner you
            can:
          </p>
          <ul className="flex flex-col gap-2 text-sm">
            {[
              "Show a Verified badge on your shop page",
              "Update latte and menu prices, hours and contact links",
              "Add photos and reply to reviews",
              "See how many people view your page and tap Directions",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2">
                <BadgeCheck className="mt-0.5 size-4 shrink-0 text-crema" aria-hidden="true" /> {t}
              </li>
            ))}
          </ul>
          {user ? (
            <div className="flex flex-col gap-2">
              <p className="text-[13px] text-muted-foreground">Signed in as {user.email}</p>
              <AcceptInvite token={token} />
            </div>
          ) : (
            <div className="flex flex-col items-start gap-2">
              <Button asChild variant="crema">
                <Link href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}>
                  <Store /> Sign in to accept
                </Link>
              </Button>
              <p className="text-[13px] text-muted-foreground">
                Use the email or Google account you&apos;ll manage the shop with.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function InvitePage({ params }: PageProps<"/invite/[token]">) {
  return (
    <PageShell>
      <Suspense fallback={<Skeleton className="h-72 w-full rounded-[20px]" />}>
        <InviteContent params={params} />
      </Suspense>
    </PageShell>
  );
}
