"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Heart } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getSavedKinds, setSaved, type SavedKind } from "@/lib/db";
import { hasSupabaseEnv } from "@/lib/env";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

/**
 * Favorite / Visited toggles. Reads the local session after mount (the page itself is cached)
 * and writes straight to the user's own rows (RLS: saved_shops is private per user).
 */
export function SaveButtons({ shopId, slug }: { shopId: string; slug: string }) {
  // undefined = still checking; null = signed out (or Supabase not configured).
  const [userId, setUserId] = useState<string | null | undefined>(() =>
    hasSupabaseEnv() ? undefined : null,
  );
  const [kinds, setKinds] = useState<SavedKind[]>([]);
  const [busy, setBusy] = useState<SavedKind | null>(null);

  useEffect(() => {
    if (!hasSupabaseEnv()) return;
    const db = getBrowserSupabase();
    db.auth.getSession().then(async ({ data }) => {
      const id = data.session?.user.id ?? null;
      setUserId(id);
      if (id) setKinds(await getSavedKinds(db, id, shopId).catch(() => []));
    });
  }, [shopId]);

  async function toggle(kind: SavedKind) {
    if (!userId) return;
    const on = !kinds.includes(kind);
    setBusy(kind);
    setKinds((k) => (on ? [...k, kind] : k.filter((x) => x !== kind))); // optimistic
    try {
      await setSaved(getBrowserSupabase(), userId, shopId, kind, on);
      if (on) toast.success(kind === "favorite" ? "Added to your favorites" : "Marked as visited");
    } catch {
      setKinds((k) => (on ? k.filter((x) => x !== kind) : [...k, kind]));
      toast.error("Couldn't save. Try again.");
    } finally {
      setBusy(null);
    }
  }

  if (userId === undefined) return null;
  if (!userId) {
    return (
      <Button asChild variant="ghost">
        <Link href={`/login?next=/shop/${slug}`}>
          <Heart /> Sign in to save
        </Link>
      </Button>
    );
  }
  const fav = kinds.includes("favorite");
  const visited = kinds.includes("visited");
  return (
    <>
      <Button
        variant="outline"
        aria-pressed={fav}
        disabled={busy === "favorite"}
        onClick={() => toggle("favorite")}
      >
        <Heart className={cn(fav && "fill-[var(--type-chain)] text-[var(--type-chain)]")} />
        {fav ? "Favorite" : "Add to favorites"}
      </Button>
      <Button
        variant="outline"
        aria-pressed={visited}
        disabled={busy === "visited"}
        onClick={() => toggle("visited")}
      >
        <Check className={cn(visited && "text-[var(--type-kapihan)]")} />
        {visited ? "Visited" : "Been here"}
      </Button>
    </>
  );
}
