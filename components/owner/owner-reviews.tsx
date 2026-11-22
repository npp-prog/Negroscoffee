"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageSquareReply } from "lucide-react";
import { toast } from "sonner";

import { replyToReviewAction } from "@/app/shop/[slug]/actions";
import { Stars } from "@/components/shop/stars";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import type { Review } from "@/lib/db";

function ReplyBox({ review, slug }: { review: Review; slug: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(review.ownerReply ?? "");
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <Button variant="ghost" size="sm" className="self-start" onClick={() => setOpen(true)}>
        <MessageSquareReply /> {review.ownerReply ? "Edit reply" : "Reply"}
      </Button>
    );
  }
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await replyToReviewAction(review.id, slug, text);
          if (!res.ok) return void toast.error(res.error);
          toast.success(text.trim() ? "Reply posted" : "Reply removed");
          setOpen(false);
          router.refresh();
        });
      }}
    >
      <label className="sr-only" htmlFor={`reply-${review.id}`}>
        Your reply
      </label>
      <Textarea
        id={`reply-${review.id}`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={1000}
        placeholder="Thank them, answer a question, or explain what you've improved."
        className="min-h-20"
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" variant="crema" disabled={pending}>
          {text.trim() ? "Post reply" : "Remove reply"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

/** Reviews of the owner's shop with reply boxes. */
export function OwnerReviews({ reviews, slug }: { reviews: Review[]; slug: string }) {
  return (
    <section className="flex flex-col gap-4 rounded-[20px] border bg-surface p-5 shadow-soft sm:p-6">
      <h2 className="text-lg font-semibold">Reviews</h2>
      {reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No reviews yet. Ask happy customers to leave one on your page.
        </p>
      ) : (
        <ul className="flex flex-col divide-y">
          {reviews.map((r) => (
            <li key={r.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Stars value={r.rating} />
                <span className="font-semibold">{r.authorName}</span>
                {r.status === "hidden" && (
                  <span className="text-[12px] text-muted-foreground">(hidden by moderators)</span>
                )}
              </div>
              {r.body && <p className="text-sm whitespace-pre-line">{r.body}</p>}
              {r.ownerReply && (
                <p className="border-l-2 border-crema/50 pl-3 text-sm whitespace-pre-line text-muted-foreground">
                  {r.ownerReply}
                </p>
              )}
              <ReplyBox review={r} slug={slug} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
