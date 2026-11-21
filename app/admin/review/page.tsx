import type { Metadata } from "next";

import { ReviewQueue } from "@/components/admin/review-queue";
import { listDraftsForReview } from "@/lib/db";
import { getServerSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Review drafts" };

export default async function ReviewPage() {
  const db = await getServerSupabase();
  const { drafts, total } = await listDraftsForReview(db, { limit: 30 });
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold">Review drafts</h1>
        <p className="text-muted-foreground">
          Pick the type and price, then publish. Hide places that aren&apos;t coffee shops. Grouped
          by town.
        </p>
      </header>
      {/* key: fresh batch after each refresh */}
      <ReviewQueue key={drafts.map((d) => d.id).join(",")} drafts={drafts} total={total} />
    </div>
  );
}
