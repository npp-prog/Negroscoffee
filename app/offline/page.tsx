import type { Metadata } from "next";
import Link from "next/link";

import { CupIllustration } from "@/components/brand/cup-illustration";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Offline", robots: { index: false } };

/** Shown by the service worker when a page can't load without a connection. */
export default function OfflinePage() {
  return (
    <PageShell>
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <CupIllustration className="w-32" />
        <h1 className="text-3xl font-semibold">You&apos;re offline</h1>
        <p className="max-w-sm text-muted-foreground">
          Kape Negros needs a connection to load the map and shops. Check your signal and try again.
        </p>
        <Button asChild variant="crema">
          <Link href="/">Try again</Link>
        </Button>
      </div>
    </PageShell>
  );
}
