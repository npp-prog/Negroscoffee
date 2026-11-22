"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { setReviewStatusAction } from "@/app/admin/reviews/actions";
import { StatusBadge } from "@/components/admin/status-badge";
import { Stars } from "@/components/shop/stars";
import { Button } from "@/components/ui/button";
import type { AdminReview } from "@/lib/db";

export function ReviewModeration({ reviews }: { reviews: AdminReview[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (reviews.length === 0) {
    return (
      <p className="rounded-[20px] border border-dashed p-10 text-center text-muted-foreground">
        No reviews here.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-3">
      {reviews.map((r) => (
        <li
          key={r.id}
          className="flex flex-col gap-2 rounded-[20px] border bg-surface p-4 shadow-soft"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex flex-wrap items-center gap-2 text-sm">
              <Stars value={r.rating} />
              <span className="font-semibold">{r.authorName}</span>
              <span className="text-muted-foreground">on</span>
              {r.shop ? (
                <Link
                  href={`/shop/${r.shop.slug}#reviews`}
                  target="_blank"
                  className="font-medium underline underline-offset-2"
                >
                  {r.shop.name}
                </Link>
              ) : (
                <span>deleted shop</span>
              )}
            </span>
            <span className="flex items-center gap-2">
              <StatusBadge status={r.status === "hidden" ? "hidden" : "published"} />
              <time className="text-[12px] text-muted-foreground tabular" dateTime={r.createdAt}>
                {new Date(r.createdAt).toLocaleString("en-PH", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                  timeZone: "Asia/Manila",
                })}
              </time>
            </span>
          </div>
          {r.body && <p className="text-sm whitespace-pre-line">{r.body}</p>}
          {r.ownerReply && (
            <p className="border-l-2 border-crema/50 pl-3 text-sm text-muted-foreground">
              Owner: {r.ownerReply}
            </p>
          )}
          <Button
            variant="outline"
            size="sm"
            className="self-start"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const next = r.status === "hidden" ? "visible" : "hidden";
                const res = await setReviewStatusAction(r.id, next);
                if (!res.ok) return void toast.error(res.error ?? "Failed");
                toast.success(next === "hidden" ? "Review hidden" : "Review shown again");
                router.refresh();
              })
            }
          >
            {r.status === "hidden" ? <Eye /> : <EyeOff />}{" "}
            {r.status === "hidden" ? "Show again" : "Hide"}
          </Button>
        </li>
      ))}
    </ul>
  );
}
