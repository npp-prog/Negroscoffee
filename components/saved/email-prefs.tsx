"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateNotifyEmailAction } from "@/app/saved/actions";

/** On/off switch for Kape Negros emails (new reviews for owners, new submissions for admins). */
export function EmailPrefs({
  initial,
  role,
}: {
  initial: boolean;
  role: "admin" | "owner" | "user";
}) {
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();
  const hint =
    role === "admin"
      ? "New suggestions, edits and claims, and reviews of shops you own."
      : role === "owner"
        ? "New reviews of your shop."
        : "Updates about shops you claim. Claim decisions are always emailed.";
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col gap-0.5">
        <span id="notify-email-label" className="text-sm font-medium">
          Email notifications
        </span>
        <span className="text-[13px] text-muted-foreground">{hint}</span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-labelledby="notify-email-label"
        disabled={pending}
        onClick={() => {
          const next = !on;
          setOn(next);
          start(async () => {
            const res = await updateNotifyEmailAction(next);
            if (res.ok) toast.success(next ? "Emails on" : "Emails off");
            else {
              setOn(!next);
              toast.error(res.error ?? "Couldn't save");
            }
          });
        }}
        className="relative inline-flex h-11 w-[68px] shrink-0 items-center rounded-full p-1.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-60"
      >
        <span
          aria-hidden="true"
          className={`absolute inset-x-1.5 inset-y-2 rounded-full transition-colors duration-200 ${on ? "bg-crema" : "bg-border"}`}
        />
        <span
          aria-hidden="true"
          className={`relative size-6 rounded-full bg-surface shadow-soft transition-transform duration-200 motion-reduce:transition-none ${on ? "translate-x-7" : "translate-x-0.5"}`}
        />
      </button>
    </div>
  );
}
