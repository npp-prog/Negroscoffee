"use client";

import { useTransition } from "react";
import { BadgeCheck } from "lucide-react";
import { toast } from "sonner";

import { acceptInviteAction } from "@/app/invite/[token]/actions";
import { Button } from "@/components/ui/button";

export function AcceptInvite({ token }: { token: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="crema"
      className="self-start"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await acceptInviteAction(token);
          if (res && !res.ok) toast.error(res.error);
        })
      }
    >
      <BadgeCheck /> {pending ? "Accepting…" : "Accept and manage my shop"}
    </Button>
  );
}
