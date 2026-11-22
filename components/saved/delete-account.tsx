"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { deleteAccountAction } from "@/app/saved/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

/** Two-step permanent account deletion (type DELETE to confirm). */
export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-sm font-medium">Delete account</h2>
        <p className="text-[13px] text-muted-foreground">
          Removes your account, reviews, saved lists and photos waiting for review. Approved photos
          stay on the shop page without your name. This can&apos;t be undone.
        </p>
      </div>
      {!open ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start text-destructive"
          onClick={() => setOpen(true)}
        >
          Delete my account
        </Button>
      ) : (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await deleteAccountAction(text.trim());
              // On success the action redirects; we only get here on failure.
              if (res && !res.ok) toast.error(res.error);
            });
          }}
        >
          <label htmlFor="delete-confirm" className="text-[13px]">
            Type <strong>DELETE</strong> to confirm
          </label>
          <div className="flex gap-2">
            <Input
              id="delete-confirm"
              value={text}
              onChange={(e) => setText(e.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              className="flex-1"
            />
            <Button
              type="submit"
              variant="outline"
              className="h-12 border-destructive text-destructive"
              disabled={pending || text.trim() !== "DELETE"}
            >
              {pending ? "Deleting…" : "Delete forever"}
            </Button>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="self-start"
            onClick={() => {
              setOpen(false);
              setText("");
            }}
          >
            Cancel
          </Button>
        </form>
      )}
    </div>
  );
}
