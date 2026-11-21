"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, Mail, PencilLine, User, X } from "lucide-react";
import { toast } from "sonner";

import { reviewAction } from "@/app/admin/submissions/actions";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import type { AdminSubmission } from "@/lib/db";
import { cn } from "@/lib/utils";

const KIND_LABEL = { new_shop: "New shop", claim: "Claim", correction: "Edit suggestion" } as const;
const APPROVE_LABEL = {
  new_shop: "Create draft shop",
  claim: "Approve claim",
  correction: "Mark as applied",
} as const;

/** Readable label + value pairs for a submission payload. */
function rows(s: AdminSubmission): [string, React.ReactNode][] {
  const p = s.payload;
  const text = (k: string) => (p[k] == null || p[k] === "" ? null : String(p[k]));
  const out: [string, React.ReactNode][] = [];
  const add = (label: string, v: React.ReactNode | null) =>
    v != null && v !== "" && out.push([label, v]);
  const link = (v: string | null) =>
    v ? (
      <a
        href={/^https?:/i.test(v) ? v : `https://${v}`}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all underline underline-offset-2"
      >
        {v}
      </a>
    ) : null;

  if (s.kind === "new_shop") {
    add("Name", text("name"));
    add("Type", text("type"));
    add("Latte price", text("latte_price") && `₱${text("latte_price")}`);
    add("Town", text("city_slug"));
    add("Address", text("address"));
    const loc = p.location as { lat: number; lng: number } | undefined;
    add(
      "Location",
      loc ? (
        <a
          href={`https://www.openstreetmap.org/?mlat=${loc.lat}&mlon=${loc.lng}#map=18/${loc.lat}/${loc.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="tabular underline underline-offset-2"
        >
          {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}
        </a>
      ) : (
        text("location_input")
      ),
    );
    add("Hours", text("hours"));
    add("Facebook", link(text("facebook_url")));
    add("Instagram", link(text("instagram_url")));
    add("Notes", text("notes"));
  } else if (s.kind === "correction") {
    add("What to change", text("details"));
    add("Latte price", text("latte_price") && `₱${text("latte_price")}`);
    add("Hours", text("hours"));
    if (p.permanently_closed) add("Closed", "Reported permanently closed");
  } else {
    add("Role", text("role"));
    add("Phone", text("phone"));
    add("Message", text("message"));
  }
  return out;
}

export function SubmissionCard({
  s,
  proofUrl,
  defaultOpen,
}: {
  s: AdminSubmission;
  proofUrl: string | null;
  defaultOpen?: boolean;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState(s.notes ?? "");
  const [pending, start] = useTransition();
  const title = s.shop?.name ?? (s.payload.name as string | undefined) ?? "Untitled";

  function decide(decision: "approve" | "reject") {
    start(async () => {
      const res = await reviewAction(s.id, decision, notes);
      if (res && !res.ok) return void toast.error(res.error);
      if (res?.ok) toast.success(res.message);
      router.refresh();
    });
  }

  return (
    <details
      open={defaultOpen}
      className="group rounded-[20px] border bg-surface shadow-soft open:shadow-float"
      id={`s-${s.id}`}
    >
      <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-5 py-3 [&::-webkit-details-marker]:hidden">
        <span
          className={cn(
            "w-28 shrink-0 text-[12px] font-semibold tracking-wide uppercase",
            s.kind === "claim" ? "text-crema" : "text-muted-foreground",
          )}
        >
          {KIND_LABEL[s.kind]}
        </span>
        <span className="min-w-0 flex-1 truncate font-semibold">{title}</span>
        <StatusBadge status={s.status} />
        <time
          className="hidden shrink-0 text-[12px] text-muted-foreground tabular sm:block"
          dateTime={s.createdAt}
        >
          {new Date(s.createdAt).toLocaleString("en-PH", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </time>
      </summary>

      <div className="flex flex-col gap-5 border-t px-5 py-5">
        <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
          <dl className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-2 text-sm">
            {s.shop && (
              <>
                <dt className="text-muted-foreground">Shop</dt>
                <dd className="flex flex-wrap gap-3">
                  <Link
                    href={`/admin/shops/${s.shop.id}`}
                    className="inline-flex items-center gap-1 font-medium underline underline-offset-2"
                  >
                    <PencilLine className="size-3.5" aria-hidden="true" /> Edit {s.shop.name}
                  </Link>
                  <Link
                    href={`/shop/${s.shop.slug}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                  >
                    Public page <ExternalLink className="size-3.5" aria-hidden="true" />
                  </Link>
                </dd>
              </>
            )}
            {rows(s).map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="whitespace-pre-line">{v}</dd>
              </div>
            ))}
            <dt className="text-muted-foreground">From</dt>
            <dd className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {s.submitterName && (
                <span className="inline-flex items-center gap-1">
                  <User className="size-3.5" aria-hidden="true" /> {s.submitterName}
                </span>
              )}
              {s.submitterEmail && (
                <a
                  href={`mailto:${s.submitterEmail}`}
                  className="inline-flex items-center gap-1 underline underline-offset-2"
                >
                  <Mail className="size-3.5" aria-hidden="true" /> {s.submitterEmail}
                </a>
              )}
              {!s.submitterName && !s.submitterEmail && (
                <span className="text-muted-foreground">Anonymous</span>
              )}
              <span className="text-[12px] text-muted-foreground">
                {s.submitterId ? "Signed-in account" : "No account"}
              </span>
            </dd>
          </dl>
          {proofUrl && (
            <a
              href={proofUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block overflow-hidden rounded-2xl border"
              aria-label="Open photo full size"
            >
              {/* Signed URL from a private bucket; expires in 10 minutes. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={proofUrl}
                alt={s.kind === "claim" ? "Ownership proof" : "Submitted photo"}
                className="aspect-[4/3] w-full object-cover"
              />
            </a>
          )}
        </div>

        {s.kind === "claim" && s.status === "pending" && !s.submitterId && (
          <p className="rounded-xl border border-crema/40 bg-crema/10 px-4 py-3 text-[13px]">
            The claimant wasn&apos;t signed in, so approving verifies the shop but can&apos;t link
            an owner account. Ask them to sign in with {s.submitterEmail ?? "their email"} and claim
            again if they need edit access.
          </p>
        )}

        {s.status === "pending" ? (
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Review notes{" "}
              <span className="font-normal text-muted-foreground">(internal, optional)</span>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={1000}
                className="min-h-20"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button variant="crema" disabled={pending} onClick={() => decide("approve")}>
                <Check /> {APPROVE_LABEL[s.kind]}
              </Button>
              <Button variant="outline" disabled={pending} onClick={() => decide("reject")}>
                <X /> Reject
              </Button>
            </div>
          </div>
        ) : (
          s.notes && <p className="text-sm text-muted-foreground">Notes: {s.notes}</p>
        )}
      </div>
    </details>
  );
}
