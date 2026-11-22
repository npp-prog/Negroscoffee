"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { PencilLine, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteReviewAction, saveReviewAction } from "@/app/shop/[slug]/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { getMyReview, type Review } from "@/lib/db";
import { hasSupabaseEnv } from "@/lib/env";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

const LABELS = ["", "Not for me", "Okay", "Good", "Great", "Excellent"];

/** Star picker + text. Loads the visitor's existing review (client-side; the page is cached). */
export function ReviewComposer({
  shopId,
  slug,
  shopName,
  onChanged,
}: {
  shopId: string;
  slug: string;
  shopName: string;
  /** Called after the visitor's review is saved or deleted. */
  onChanged?: () => void;
}) {
  // undefined = still checking; null = signed out (or Supabase not configured).
  const [userId, setUserId] = useState<string | null | undefined>(() =>
    hasSupabaseEnv() ? undefined : null,
  );
  const [mine, setMine] = useState<Review | null>(null);
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!hasSupabaseEnv()) return;
    const db = getBrowserSupabase();
    db.auth.getSession().then(async ({ data }) => {
      const id = data.session?.user.id ?? null;
      setUserId(id);
      if (!id) return;
      const r = await getMyReview(db, shopId, id).catch(() => null);
      setMine(r);
      if (r) {
        setRating(r.rating);
        setBody(r.body ?? "");
      }
    });
  }, [shopId]);

  if (userId === undefined) return null;
  if (!userId) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-dashed p-5">
        <p className="text-sm text-muted-foreground">Been to {shopName}? Share how it was.</p>
        <Button asChild variant="crema">
          <Link href={`/login?next=/shop/${slug}`}>
            <Star /> Sign in to review
          </Link>
        </Button>
      </div>
    );
  }

  if (mine && !editing) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border bg-surface p-4 text-sm shadow-soft">
        <span>
          You rated this <span className="font-semibold">{mine.rating}★</span>
          {mine.status === "hidden" && (
            <span className="text-muted-foreground"> · hidden by moderators</span>
          )}
        </span>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            <PencilLine /> Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => {
              if (!confirm("Delete your review?")) return;
              start(async () => {
                const res = await deleteReviewAction(slug);
                if (!res.ok) return void toast.error(res.error);
                toast.success("Review deleted");
                setMine(null);
                setRating(0);
                setBody("");
                onChanged?.();
              });
            }}
          >
            <Trash2 /> Delete
          </Button>
        </div>
      </div>
    );
  }

  const shown = hover || rating;
  return (
    <form
      className="flex flex-col gap-3 rounded-[20px] border bg-surface p-5 shadow-soft"
      onSubmit={(e) => {
        e.preventDefault();
        if (!rating) return void toast.error("Pick 1 to 5 stars.");
        start(async () => {
          const res = await saveReviewAction(slug, rating, body);
          if (!res.ok) return void toast.error(res.error);
          toast.success(mine ? "Review updated" : "Thanks for your review!");
          setMine({ ...(mine as Review), rating, body, status: mine?.status ?? "visible" });
          setEditing(false);
          onChanged?.();
        });
      }}
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold">
          {mine ? "Edit your review" : "Your rating"}
        </legend>
        <div className="flex items-center gap-3">
          <div
            role="radiogroup"
            aria-label="Rating"
            className="flex"
            onMouseLeave={() => setHover(0)}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} star${n === 1 ? "" : "s"}: ${LABELS[n]}`}
                onMouseEnter={() => setHover(n)}
                onClick={() => setRating(n)}
                className="grid size-11 place-items-center rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <Star
                  className={cn(
                    "size-7 transition-colors",
                    n <= shown ? "fill-crema text-crema" : "text-crema/40",
                  )}
                  strokeWidth={1.5}
                />
              </button>
            ))}
          </div>
          <span className="text-sm text-muted-foreground" aria-live="polite">
            {LABELS[shown]}
          </span>
        </div>
      </fieldset>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Your review <span className="font-normal text-muted-foreground">(optional)</span>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={1000}
          placeholder="What did you order? How was the coffee, the vibe, the service?"
          className="min-h-24"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="crema" disabled={pending || !rating}>
          {mine ? "Save changes" : "Post review"}
        </Button>
        {mine && (
          <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        )}
      </div>
      <p className="text-[12px] text-muted-foreground">
        Shown with your display name. Be kind and honest; reviews that break the rules may be
        hidden.
      </p>
    </form>
  );
}
