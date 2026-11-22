"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, ImagePlus, LoaderCircle, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  deletePhotoAction,
  reorderPhotosAction,
  uploadPhotosAction,
} from "@/app/admin/shops/[id]/actions";
import { shrink } from "@/components/forms/photo-input";
import { shopPhotoUrl } from "@/lib/db";
import { SUPABASE_URL } from "@/lib/env";

export function PhotoManager({
  shopId,
  photos,
}: {
  shopId: string;
  photos: { id: string; storage_path: string; caption: string | null }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, done?: string) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) toast.error(res.error ?? "Something went wrong");
      else if (done) toast.success(done);
      router.refresh();
    });

  /** Shrink each photo in the browser (phone photos are often 4–8 MB), then upload one by one. */
  function upload(files: FileList | null) {
    if (!files?.length) return;
    const picked = Array.from(files).slice(0, 10);
    if (input.current) input.current.value = "";
    start(async () => {
      let added = 0;
      let lastError: string | null = null;
      for (const original of picked) {
        try {
          const file = await shrink(original);
          const fd = new FormData();
          fd.append("photos", file);
          const res = await uploadPhotosAction(shopId, fd);
          if (res.ok) added += 1;
          else lastError = res.error;
        } catch {
          lastError = `${original.name}: too large to upload. Try a smaller photo.`;
        }
      }
      if (added) toast.success(`${added} photo${added > 1 ? "s" : ""} added`);
      if (lastError) toast.error(lastError);
      if (files.length > 10) toast.message("Only the first 10 photos were added.");
      router.refresh();
    });
  }

  function move(i: number, by: number) {
    const ids = photos.map((p) => p.id);
    const [it] = ids.splice(i, 1);
    ids.splice(i + by, 0, it);
    run(() => reorderPhotosAction(shopId, ids));
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-busy={pending}>
        {photos.map((p, i) => (
          <li key={p.id} className="group relative overflow-hidden rounded-2xl border bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={shopPhotoUrl(SUPABASE_URL, p.storage_path, { width: 400, height: 300 })}
              alt={p.caption ?? `Photo ${i + 1}`}
              className="aspect-[4/3] w-full object-cover"
            />
            {i === 0 && (
              <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-surface/90 px-2 py-0.5 text-[11px] font-semibold shadow-soft">
                <Star className="size-3 text-crema" aria-hidden="true" /> Cover
              </span>
            )}
            <div className="flex items-center justify-between gap-1 bg-surface p-1">
              <div className="flex">
                <button
                  type="button"
                  disabled={i === 0 || pending}
                  onClick={() => move(i, -1)}
                  aria-label="Move photo earlier"
                  className="grid size-10 place-items-center rounded-full hover:bg-accent disabled:opacity-30"
                >
                  <ArrowLeft className="size-4" />
                </button>
                <button
                  type="button"
                  disabled={i === photos.length - 1 || pending}
                  onClick={() => move(i, 1)}
                  aria-label="Move photo later"
                  className="grid size-10 place-items-center rounded-full hover:bg-accent disabled:opacity-30"
                >
                  <ArrowRight className="size-4" />
                </button>
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  if (confirm("Delete this photo?"))
                    run(() => deletePhotoAction(shopId, p.id), "Photo deleted");
                }}
                aria-label="Delete photo"
                className="grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-foreground"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </li>
        ))}
        <li>
          <label className="flex aspect-[4/3] h-full min-h-32 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed text-sm font-medium text-muted-foreground focus-within:ring-2 focus-within:ring-ring hover:border-crema hover:text-foreground">
            {pending ? (
              <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
            ) : (
              <ImagePlus className="size-5" aria-hidden="true" />
            )}
            {pending ? "Working…" : "Add photos"}
            <input
              ref={input}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="sr-only"
              onChange={(e) => upload(e.target.files)}
              disabled={pending}
            />
          </label>
        </li>
      </ul>
      <p className="text-[12px] text-muted-foreground">
        The first photo is the cover on the map and shop page. Up to 10 at a time, 8 MB each.
      </p>
    </div>
  );
}
