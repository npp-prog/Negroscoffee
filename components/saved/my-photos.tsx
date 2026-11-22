"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ImageOff } from "lucide-react";
import { toast } from "sonner";

import { withdrawPhotoAction } from "@/app/saved/actions";
import { shopPhotoUrl, type MyPhoto } from "@/lib/db";
import { SUPABASE_URL } from "@/lib/env";
import { cn } from "@/lib/utils";

const STATUS: Record<MyPhoto["status"], { label: string; className: string }> = {
  pending: { label: "Waiting for review", className: "bg-crema/15 text-foreground" },
  approved: { label: "Live", className: "bg-[var(--type-kapihan)]/15 text-foreground" },
  rejected: { label: "Not approved", className: "bg-muted text-muted-foreground" },
};

/** The visitor's own photo submissions with their review status. */
export function MyPhotos({ photos: initial }: { photos: MyPhoto[] }) {
  const [photos, setPhotos] = useState(initial);
  const [pending, start] = useTransition();
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {photos.map((p) => {
        const src =
          p.previewUrl ??
          (p.publicPath
            ? shopPhotoUrl(SUPABASE_URL, p.publicPath, { width: 400, height: 300 })
            : null);
        const status = STATUS[p.status];
        return (
          <li
            key={p.id}
            className="flex flex-col overflow-hidden rounded-2xl border bg-surface shadow-soft"
          >
            {src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src}
                alt={p.caption ?? `Your photo of ${p.shopName}`}
                className="aspect-[4/3] w-full bg-muted object-cover"
              />
            ) : (
              <span
                className="grid aspect-[4/3] place-items-center bg-muted text-muted-foreground"
                aria-hidden="true"
              >
                <ImageOff className="size-6" />
              </span>
            )}
            <div className="flex flex-1 flex-col gap-1.5 p-3">
              <Link
                href={`/shop/${p.shopSlug}`}
                className="truncate text-sm font-semibold hover:underline"
              >
                {p.shopName}
              </Link>
              <span
                className={cn(
                  "self-start rounded-full px-2 py-0.5 text-[12px] font-medium",
                  status.className,
                )}
              >
                {status.label}
              </span>
              {p.status === "pending" && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const res = await withdrawPhotoAction(p.id);
                      if (res.ok) {
                        setPhotos((list) => list.filter((x) => x.id !== p.id));
                        toast.success("Photo withdrawn");
                      } else toast.error(res.error ?? "Couldn't withdraw");
                    })
                  }
                  className="-mx-1 mt-auto min-h-11 self-start rounded-lg px-1 text-[13px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  Withdraw
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
