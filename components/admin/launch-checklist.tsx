"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, Rocket } from "lucide-react";
import { toast } from "sonner";

import { removeDemoShopsAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import type { LaunchItem } from "@/lib/launch";
import { cn } from "@/lib/utils";

export function LaunchChecklist({ items: initial }: { items: LaunchItem[] }) {
  const [items, setItems] = useState(initial);
  const [pending, start] = useTransition();
  const required = items.filter((i) => !i.optional);
  const doneRequired = required.filter((i) => i.done).length;
  const ready = doneRequired === required.length;

  function removeDemos() {
    if (!window.confirm("Remove all demo shops (slugs starting with demo-)? This can't be undone."))
      return;
    start(async () => {
      const res = await removeDemoShopsAction();
      if (!res.ok) return void toast.error(res.error ?? "Couldn't remove");
      toast.success(`Removed ${res.removed} demo shops`);
      setItems((list) =>
        list.map((i) =>
          i.key === "demo" ? { ...i, done: true, hint: "No fictional demo shops left." } : i,
        ),
      );
    });
  }

  return (
    <section
      aria-labelledby="launch-h"
      className="flex flex-col gap-4 rounded-[20px] border bg-surface p-5 shadow-soft"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="launch-h" className="flex items-center gap-2 text-lg font-semibold">
          <Rocket className="size-5 text-crema" aria-hidden="true" /> Launch checklist
        </h2>
        <span className="text-sm text-muted-foreground tabular">
          {ready ? "Ready to launch" : `${doneRequired} of ${required.length} done`}
        </span>
      </div>
      <ul className="flex flex-col gap-3">
        {items.map((i) => (
          <li key={i.key} className="flex items-start gap-3">
            {i.done ? (
              <CheckCircle2
                className="mt-0.5 size-5 shrink-0 text-[var(--type-kapihan)]"
                aria-hidden="true"
              />
            ) : (
              <Circle
                className={cn("mt-0.5 size-5 shrink-0", i.optional ? "text-border" : "text-crema")}
                aria-hidden="true"
              />
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-sm font-medium">
                <span className="sr-only">{i.done ? "Done: " : "To do: "}</span>
                {i.label}
                {i.optional && (
                  <span className="font-normal text-muted-foreground"> (optional)</span>
                )}
              </span>
              <span className="text-[13px] text-muted-foreground">
                {i.hint}
                {i.href && !i.done && (
                  <>
                    {" "}
                    <Link
                      href={i.href}
                      className="font-medium text-foreground underline underline-offset-2"
                    >
                      Open
                    </Link>
                  </>
                )}
              </span>
              {i.key === "demo" && !i.done && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-1 self-start"
                  disabled={pending}
                  onClick={removeDemos}
                >
                  {pending ? "Removing…" : "Remove demo shops"}
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
