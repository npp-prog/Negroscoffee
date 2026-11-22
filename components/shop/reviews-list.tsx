import { Store } from "lucide-react";

import { Stars } from "@/components/shop/stars";
import type { Review } from "@/lib/db";

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila",
  });

export function ReviewsList({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) {
    return <p className="text-sm text-muted-foreground">No reviews yet. Be the first!</p>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {reviews.map((r) => (
        <li
          key={r.id}
          className="flex flex-col gap-2 rounded-[20px] border bg-surface p-4 shadow-soft"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <Stars value={r.rating} />
              <span className="sr-only">{r.rating} out of 5 stars</span>
              <span className="text-sm font-semibold">{r.authorName}</span>
            </span>
            <time className="text-[12px] text-muted-foreground tabular" dateTime={r.createdAt}>
              {fmt(r.createdAt)}
            </time>
          </div>
          {r.body && <p className="text-sm whitespace-pre-line">{r.body}</p>}
          {r.ownerReply && (
            <div className="ml-3 flex flex-col gap-1 border-l-2 border-crema/50 pl-3 text-sm">
              <span className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground">
                <Store className="size-3.5" aria-hidden="true" /> Reply from the owner
              </span>
              <p className="whitespace-pre-line">{r.ownerReply}</p>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
