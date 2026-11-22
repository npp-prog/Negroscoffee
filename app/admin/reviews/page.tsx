import type { Metadata } from "next";
import Link from "next/link";

import { ReviewModeration } from "@/components/admin/review-moderation";
import { listRecentReviews, type ReviewStatus } from "@/lib/db";
import { getServerSupabase } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Reviews" };

const TABS: { key: ReviewStatus | "all"; label: string }[] = [
  { key: "all", label: "Latest" },
  { key: "hidden", label: "Hidden" },
];

export default async function AdminReviewsPage({ searchParams }: PageProps<"/admin/reviews">) {
  const sp = await searchParams;
  const status = sp.status === "hidden" ? "hidden" : undefined;
  const db = await getServerSupabase();
  const reviews = await listRecentReviews(db, { status, limit: 60 });
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold">Reviews</h1>
        <p className="text-muted-foreground">
          Hide reviews that are abusive, spam, or not about the shop. Hidden reviews don&apos;t
          count toward ratings.
        </p>
      </div>
      <nav aria-label="Filter" className="flex gap-2">
        {TABS.map((t) => {
          const active = (status ?? "all") === t.key;
          return (
            <Link
              key={t.key}
              href={t.key === "all" ? "/admin/reviews" : `/admin/reviews?status=${t.key}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex h-10 items-center rounded-full px-3.5 text-sm font-medium",
                active
                  ? "bg-primary text-primary-foreground"
                  : "border bg-surface text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
      <ReviewModeration reviews={reviews} />
    </div>
  );
}
