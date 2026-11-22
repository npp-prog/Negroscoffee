"use client";

import { useCallback, useEffect, useState } from "react";

import { ReviewComposer } from "@/components/shop/review-composer";
import { ReviewsList } from "@/components/shop/reviews-list";
import { Stars } from "@/components/shop/stars";
import { listShopReviews, type Review } from "@/lib/db";
import { hasSupabaseEnv } from "@/lib/env";
import { getBrowserSupabase } from "@/lib/supabase/browser";

const PAGE = 30;

/**
 * Reviews block. Starts from the server-rendered (cached) list, then refreshes from Supabase
 * after mount and after the visitor posts, edits or deletes, so it never shows a stale copy.
 */
export function ReviewsSection({
  shopId,
  slug,
  shopName,
  initialReviews,
  initialAvg,
  initialCount,
}: {
  shopId: string;
  slug: string;
  shopName: string;
  initialReviews: Review[];
  initialAvg: number | null;
  initialCount: number;
}) {
  const [reviews, setReviews] = useState(initialReviews);
  const [summary, setSummary] = useState({ avg: initialAvg, count: initialCount });

  const load = useCallback(async (): Promise<Review[] | null> => {
    if (!hasSupabaseEnv()) return null;
    // Visible reviews only, even for signed-in authors (their own hidden review shows in the composer).
    const rows = await listShopReviews(getBrowserSupabase(), shopId, PAGE).catch(() => null);
    return rows ? rows.filter((r) => r.status === "visible") : null;
  }, [shopId]);

  const apply = useCallback((fresh: Review[] | null) => {
    if (!fresh) return;
    setReviews(fresh);
    // Exact when everything fits on one page; otherwise keep the server's aggregate.
    if (fresh.length < PAGE) {
      const count = fresh.length;
      const avg = count
        ? Math.round((fresh.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10
        : null;
      setSummary({ avg, count });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    load().then((fresh) => {
      if (!cancelled) apply(fresh);
    });
    return () => {
      cancelled = true;
    };
  }, [load, apply]);

  const refresh = useCallback(() => {
    load().then(apply);
  }, [load, apply]);

  return (
    <section id="reviews" className="flex scroll-mt-20 flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-xl font-semibold">Reviews</h2>
        {summary.count > 0 && summary.avg != null && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Stars value={summary.avg} />
            <span>
              <span className="font-semibold text-foreground tabular">
                {summary.avg.toFixed(1)}
              </span>{" "}
              · {summary.count} review{summary.count === 1 ? "" : "s"}
            </span>
          </p>
        )}
      </div>
      <ReviewComposer shopId={shopId} slug={slug} shopName={shopName} onChanged={refresh} />
      <ReviewsList reviews={reviews} />
    </section>
  );
}
