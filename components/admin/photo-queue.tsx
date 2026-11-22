"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, ImageOff, X } from "lucide-react";
import { toast } from "sonner";

import { reviewPhotoAction } from "@/app/admin/photos/actions";
import { Button } from "@/components/ui/button";
import type { PendingPhoto } from "@/lib/db";

const when = (iso: string) =>
  new Date(iso).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    timeZone: "Asia/Manila",
  });

export function PhotoQueue({ photos: initial }: { photos: PendingPhoto[] }) {
  const [photos, setPhotos] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [, start] = useTransition();

  if (photos.length === 0) {
    return (
      <p className="rounded-[20px] border border-dashed p-8 text-center text-muted-foreground">
        No photos waiting. Nice!
      </p>
    );
  }

  function decide(p: PendingPhoto, decision: "approve" | "reject") {
    setBusy(p.id);
    start(async () => {
      const res = await reviewPhotoAction(p.id, decision);
      setBusy(null);
      if (res.ok) {
        setPhotos((list) => list.filter((x) => x.id !== p.id));
        toast.success(decision === "approve" ? `Added to ${p.shopName}` : "Photo declined");
      } else toast.error(res.error ?? "Couldn't save");
    });
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {photos.map((p) => (
        <li
          key={p.id}
          className="flex flex-col overflow-hidden rounded-[20px] border bg-surface shadow-soft"
        >
          {p.previewUrl ? (
            <a
              href={p.previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open full size"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.previewUrl}
                alt={p.caption ?? `Photo of ${p.shopName}`}
                className="aspect-[4/3] w-full bg-muted object-cover"
              />
            </a>
          ) : (
            <span className="grid aspect-[4/3] place-items-center bg-muted text-muted-foreground">
              <ImageOff className="size-6" aria-hidden="true" />
              <span className="sr-only">Preview unavailable</span>
            </span>
          )}
          <div className="flex flex-1 flex-col gap-2 p-4">
            <div className="flex flex-col">
              <Link
                href={`/shop/${p.shopSlug}`}
                target="_blank"
                className="font-semibold hover:underline"
              >
                {p.shopName}
              </Link>
              <span className="text-[13px] text-muted-foreground">
                by {p.contributor} · {when(p.createdAt)}
              </span>
            </div>
            {p.caption && <p className="text-sm">&ldquo;{p.caption}&rdquo;</p>}
            <div className="mt-auto flex gap-2 pt-1">
              <Button
                size="sm"
                variant="crema"
                disabled={busy === p.id}
                onClick={() => decide(p, "approve")}
              >
                <Check /> Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy === p.id}
                onClick={() => decide(p, "reject")}
              >
                <X /> Decline
              </Button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
