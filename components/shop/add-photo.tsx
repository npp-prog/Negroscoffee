"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { Camera } from "lucide-react";
import { toast } from "sonner";

import { addPhotoAction, type PhotoResult } from "@/app/shop/[slug]/actions";
import { PhotoInput } from "@/components/forms/photo-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { hasSupabaseEnv } from "@/lib/env";
import { getBrowserSupabase } from "@/lib/supabase/browser";

/**
 * "Add a photo" for visitors. The shop page is cached, so the session is read after mount.
 * Photos go to a private queue and appear once an admin approves them.
 */
export function AddPhoto({ slug, shopName }: { slug: string; shopName: string }) {
  // undefined = checking; null = signed out (or Supabase not configured).
  const [signedIn, setSignedIn] = useState<boolean | null | undefined>(() =>
    hasSupabaseEnv() ? undefined : null,
  );
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<PhotoResult, FormData>(addPhotoAction, {
    status: "idle",
  });

  useEffect(() => {
    if (!hasSupabaseEnv()) return;
    getBrowserSupabase()
      .auth.getSession()
      .then(({ data }) => setSignedIn(!!data.session));
  }, []);

  useEffect(() => {
    if (state.status === "success") {
      toast.success("Thanks! Your photo will appear after a quick check.");
    }
  }, [state]);

  if (signedIn === undefined) return null;
  if (!signedIn) {
    return (
      <Button asChild variant="outline" size="sm">
        <Link href={`/login?next=${encodeURIComponent(`/shop/${slug}`)}`}>
          <Camera /> Sign in to add photos
        </Link>
      </Button>
    );
  }
  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Camera /> Add a photo
      </Button>
    );
  }
  return (
    <form
      action={action}
      className="flex w-full flex-col gap-3 rounded-2xl border bg-surface p-4"
      aria-label={`Add a photo of ${shopName}`}
    >
      <input type="hidden" name="slug" value={slug} />
      <PhotoInput
        id="visitor-photo"
        name="photo"
        required
        label="Choose photo"
        invalid={state.status === "error"}
        describedBy={state.status === "error" ? "visitor-photo-error" : undefined}
      />
      <label htmlFor="visitor-photo-caption" className="sr-only">
        Caption (optional)
      </label>
      <Input
        id="visitor-photo-caption"
        name="caption"
        maxLength={200}
        placeholder="Caption (optional)"
      />
      {state.status === "error" && (
        <p id="visitor-photo-error" role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <p className="text-[12px] text-muted-foreground">
        Only photos you took. They show your name and appear after a quick check.
      </p>
      <div className="flex gap-2">
        <Button type="submit" variant="crema" size="sm" disabled={pending}>
          {pending ? "Uploading…" : "Send photo"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Close
        </Button>
      </div>
    </form>
  );
}
