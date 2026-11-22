"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Link2, QrCode, Unlink, UserCheck } from "lucide-react";
import { toast } from "sonner";

import { linkOwnerAction, unlinkOwnerAction } from "@/app/admin/shops/[id]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { InvitePanel } from "@/components/admin/invite-panel";
import type { ActiveInvite } from "@/lib/db";

/** Link a verified owner's account to this shop by email, or remove the link. */
export function OwnerPanel({
  shopId,
  shopName,
  shopSlug,
  published,
  ownerEmail,
  invite,
}: {
  shopId: string;
  shopName: string;
  shopSlug: string;
  published: boolean;
  ownerEmail: string | null;
  invite: ActiveInvite | null;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pending, start] = useTransition();

  const run = (fn: () => ReturnType<typeof linkOwnerAction>, done: string) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) return void toast.error(res.error);
      toast.success(done);
      setEmail("");
      router.refresh();
    });

  return (
    <section className="flex flex-col gap-3 rounded-[20px] border bg-surface p-5 shadow-soft sm:p-6">
      <h2 className="text-lg font-semibold">Owner</h2>
      {ownerEmail ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm">
            <UserCheck className="size-4 text-crema" aria-hidden="true" />
            Managed by <span className="font-medium">{ownerEmail}</span>
          </p>
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => {
              if (confirm(`Remove ${ownerEmail} as owner? They'll lose edit access.`)) {
                run(() => unlinkOwnerAction(shopId), "Owner removed");
              }
            }}
          >
            <Unlink /> Remove owner
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No owner linked. The owner must sign in once at /login; then enter their email to give
          them edit access to prices, hours, menu and photos.
        </p>
      )}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => linkOwnerAction(shopId, email), "Owner linked");
        }}
      >
        <label htmlFor="owner-email" className="sr-only">
          Owner email
        </label>
        <Input
          id="owner-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="owner@example.com"
          className="flex-1"
        />
        <Button type="submit" variant="outline" className="h-12" disabled={pending || !email}>
          <Link2 /> {ownerEmail ? "Change" : "Link"}
        </Button>
      </form>
      {!ownerEmail && <InvitePanel shopId={shopId} shopName={shopName} invite={invite} />}
      {published && (
        <p className="text-sm">
          <a
            href={`/poster/${shopSlug}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 font-medium underline-offset-2 hover:underline"
          >
            <QrCode className="size-4 text-crema" aria-hidden="true" /> Printable QR poster
          </a>
        </p>
      )}
    </section>
  );
}
