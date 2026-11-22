"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateDisplayNameAction } from "@/app/saved/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

export function DisplayNameForm({ initial }: { initial: string }) {
  const [name, setName] = useState(initial);
  const [pending, start] = useTransition();
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await updateDisplayNameAction(name);
          if (res.ok) toast.success("Name saved");
          else toast.error(res.error ?? "Couldn't save");
        });
      }}
    >
      <label htmlFor="display-name" className="text-sm font-medium">
        Name shown on your reviews
      </label>
      <div className="flex gap-2">
        <Input
          id="display-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          placeholder="Coffee lover"
          className="flex-1"
        />
        <Button type="submit" variant="outline" className="h-12" disabled={pending}>
          Save
        </Button>
      </div>
    </form>
  );
}
