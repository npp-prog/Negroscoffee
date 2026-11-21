"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EyeOff, MapPin, PencilLine, Phone, Send, SkipForward } from "lucide-react";
import { toast } from "sonner";

import { quickReviewAction } from "@/app/admin/review/actions";
import { Button } from "@/components/ui/button";
import {
  PRICE_TIERS,
  PRICE_TIER_META,
  SHOP_TYPES,
  SHOP_TYPE_META,
  type ShopType,
} from "@/lib/categories";
import type { ReviewDraft } from "@/lib/db";
import { tierForLattePrice } from "@/lib/tier";
import { cn } from "@/lib/utils";

function ReviewCard({
  d,
  onDone,
  onSkip,
}: {
  d: ReviewDraft;
  onDone: () => void;
  onSkip: () => void;
}) {
  const [type, setType] = useState<ShopType | null>(d.type);
  const [latte, setLatte] = useState(d.lattePrice != null ? String(Math.round(d.lattePrice)) : "");
  const [tier, setTier] = useState("");
  const [pending, start] = useTransition();
  const autoTier = tierForLattePrice(latte ? Number(latte) : null);
  const canPublish = !!type && (!!latte || !!tier) && !!d.province;

  function decide(status: "published" | "hidden") {
    start(async () => {
      const res = await quickReviewAction(d.id, {
        status,
        type,
        lattePrice: latte,
        priceTier: tier,
      });
      if (!res.ok) return void toast.error(res.error);
      toast.success(status === "published" ? `Published ${d.name}` : `Hid ${d.name}`);
      onDone();
    });
  }

  const mapsHref =
    d.lat != null ? `https://www.google.com/maps/search/?api=1&query=${d.lat},${d.lng}` : null;

  return (
    <article className="flex flex-col gap-4 rounded-[20px] border bg-surface p-5 shadow-soft">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold">{d.name}</h2>
          <p className="text-sm text-muted-foreground">
            {[d.address, d.cityName].filter(Boolean).join(", ") || "No town yet"}
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {mapsHref && (
            <Button asChild variant="ghost" size="sm">
              <a href={mapsHref} target="_blank" rel="noopener noreferrer">
                <MapPin /> Map
              </a>
            </Button>
          )}
          {d.phone && (
            <Button asChild variant="ghost" size="sm">
              <a href={`tel:${d.phone.replace(/\s+/g, "")}`}>
                <Phone /> Call
              </a>
            </Button>
          )}
          <Button asChild variant="ghost" size="sm">
            <Link href={`/admin/shops/${d.id}`}>
              <PencilLine /> Full editor
            </Link>
          </Button>
        </div>
      </header>

      <div role="radiogroup" aria-label={`Type of ${d.name}`} className="grid grid-cols-3 gap-2">
        {SHOP_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={type === t}
            onClick={() => setType(t)}
            className={cn(
              "flex min-h-12 items-center justify-center gap-2 rounded-xl border px-2 text-sm font-medium transition-colors",
              type === t
                ? "border-transparent bg-primary text-primary-foreground"
                : "bg-background hover:bg-accent",
            )}
          >
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: SHOP_TYPE_META[t].colorVar }}
            />
            {SHOP_TYPE_META[t].label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          12 oz latte (₱)
          <input
            value={latte}
            onChange={(e) => setLatte(e.target.value.replace(/[^\d]/g, ""))}
            inputMode="numeric"
            placeholder="e.g. 140"
            className="h-12 rounded-xl border bg-background px-3.5 text-[15px] tabular"
          />
          <span className="text-[12px] font-normal text-muted-foreground">
            {autoTier
              ? `${PRICE_TIER_META[autoTier].symbol} ${PRICE_TIER_META[autoTier].label}`
              : "Sets the price tier"}
          </span>
        </label>
        <div className="flex flex-col gap-1.5 text-sm font-medium">
          <span>…or just the tier</span>
          <div role="radiogroup" aria-label="Price tier" className="grid grid-cols-4 gap-1.5">
            {PRICE_TIERS.map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={tier === String(t)}
                aria-label={`${PRICE_TIER_META[t].label}: ${PRICE_TIER_META[t].range}`}
                onClick={() => setTier(tier === String(t) ? "" : String(t))}
                className={cn(
                  "min-h-12 rounded-xl border text-sm font-semibold tabular",
                  tier === String(t)
                    ? "border-transparent bg-primary text-primary-foreground"
                    : "bg-background hover:bg-accent",
                )}
              >
                {PRICE_TIER_META[t].symbol}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!d.province && (
        <p className="rounded-xl border border-crema/40 bg-crema/10 px-3 py-2 text-[13px]">
          No town matched for this place. Use <span className="font-medium">Full editor</span> to
          set the town before publishing.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          variant="crema"
          disabled={pending || !canPublish}
          onClick={() => decide("published")}
          className="flex-1 sm:flex-none"
        >
          <Send /> Publish
        </Button>
        <Button variant="outline" disabled={pending} onClick={() => decide("hidden")}>
          <EyeOff /> Not a coffee shop
        </Button>
        <Button variant="ghost" disabled={pending} onClick={onSkip}>
          <SkipForward /> Skip
        </Button>
      </div>
    </article>
  );
}

export function ReviewQueue({ drafts, total }: { drafts: ReviewDraft[]; total: number }) {
  const router = useRouter();
  const [queue, setQueue] = useState(drafts);
  const [done, setDone] = useState(0);
  const current = queue[0];

  const next = (handled: boolean) => {
    if (handled) setDone((n) => n + 1);
    setQueue((q) => {
      const rest = q.slice(1);
      if (rest.length === 0) router.refresh(); // load the next batch
      return handled ? rest : [...rest, q[0]];
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div
        className="flex items-center justify-between gap-3 text-sm text-muted-foreground"
        aria-live="polite"
      >
        <span>
          <span className="font-semibold text-foreground tabular">{Math.max(0, total - done)}</span>{" "}
          drafts left
          {done > 0 && <> · {done} done this session</>}
        </span>
        <div className="h-2 w-40 overflow-hidden rounded-full bg-muted" aria-hidden="true">
          <div
            className="h-full bg-crema transition-[width]"
            style={{ width: `${total ? (done / total) * 100 : 100}%` }}
          />
        </div>
      </div>
      {current ? (
        <ReviewCard
          key={current.id}
          d={current}
          onDone={() => next(true)}
          onSkip={() => next(false)}
        />
      ) : (
        <p className="rounded-[20px] border border-dashed p-10 text-center text-muted-foreground">
          {total - done > 0 ? "Loading more…" : "All drafts reviewed. Nice work!"}
        </p>
      )}
      {queue.length > 1 && (
        <p className="text-[13px] text-muted-foreground">
          Up next:{" "}
          {queue
            .slice(1, 4)
            .map((q) => q.name)
            .join(" · ")}
          {queue.length > 4 ? " …" : ""}
        </p>
      )}
    </div>
  );
}
