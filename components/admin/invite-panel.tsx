"use client";

import { useState, useTransition } from "react";
import { Check, Copy, MailPlus, Share2, X } from "lucide-react";
import { toast } from "sonner";

import { createInviteAction, revokeInviteAction } from "@/app/admin/shops/[id]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import type { ActiveInvite } from "@/lib/db";

const day = (iso: string) =>
  new Date(iso).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    timeZone: "Asia/Manila",
  });

/**
 * One-time owner invite link. The full link is only shown right after creating it (the database
 * keeps a hash), so the admin copies or shares it straight away.
 */
export function InvitePanel({
  shopId,
  shopName,
  invite: initial,
}: {
  shopId: string;
  shopName: string;
  invite: ActiveInvite | null;
}) {
  const [invite, setInvite] = useState(initial);
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const message = url
    ? `Hi! ${shopName} is listed on Kape Negros, the coffee map of Negros Island. Tap this private link to manage your shop page (prices, hours, menu, photos): ${url}`
    : "";

  function create() {
    start(async () => {
      const res = await createInviteAction(shopId);
      if (!res.ok) return void toast.error(res.error);
      setUrl(res.url);
      setInvite({ createdAt: new Date().toISOString(), expiresAt: res.expiresAt });
      setCopied(false);
    });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast.success("Invite message copied");
    } catch {
      toast.error("Couldn't copy. Select the link and copy it manually.");
    }
  }

  async function share() {
    if (navigator.share) {
      await navigator
        .share({ title: `Manage ${shopName} on Kape Negros`, text: message })
        .catch(() => {});
    } else void copy();
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-dashed p-4">
      <div className="flex flex-col gap-0.5">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <MailPlus className="size-4 text-crema" aria-hidden="true" /> Invite the owner
        </h3>
        <p className="text-[13px] text-muted-foreground">
          Send a private link (valid 14 days, works once). The owner signs in, taps Accept and
          becomes the verified owner, no proof needed.
        </p>
      </div>
      {url ? (
        <div className="flex flex-col gap-2">
          <label htmlFor="invite-url" className="text-[13px] font-medium">
            Invite link (shown once, copy it now)
          </label>
          <Input id="invite-url" readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="crema" onClick={share}>
              <Share2 /> Share
            </Button>
            <Button size="sm" variant="outline" onClick={copy}>
              {copied ? <Check /> : <Copy />} Copy message
            </Button>
          </div>
        </div>
      ) : invite ? (
        <p className="text-[13px]">
          An invite sent on {day(invite.createdAt)} is open until {day(invite.expiresAt)}. Lost the
          link? Create a new one (the old link stops working).
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={pending} onClick={create}>
          <MailPlus /> {invite ? "Create new link" : "Create invite link"}
        </Button>
        {invite && (
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await revokeInviteAction(shopId);
                if (!res.ok) return void toast.error(res.error ?? "Couldn't cancel");
                setInvite(null);
                setUrl(null);
                toast.success("Invite cancelled");
              })
            }
          >
            <X /> Cancel invite
          </Button>
        )}
      </div>
    </div>
  );
}
