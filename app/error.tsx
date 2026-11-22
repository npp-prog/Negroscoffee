"use client";

import { useEffect } from "react";
import Link from "next/link";

import { ResultsEmpty } from "@/components/explore/results-list";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";

/** Friendly fallback when a page throws (e.g. the database is briefly unreachable). */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <PageShell>
      <ResultsEmpty
        title="Something spilled"
        body="This page couldn't load. Check your connection and try again."
        action={
          <div className="flex gap-2">
            <Button size="sm" onClick={reset}>
              Try again
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/">Back to the map</Link>
            </Button>
          </div>
        }
      />
    </PageShell>
  );
}
