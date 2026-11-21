import * as React from "react";

import { cn } from "@/lib/utils";

const control =
  "w-full rounded-xl border bg-surface px-3.5 text-[15px] shadow-soft transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:border-crema focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none aria-invalid:border-destructive aria-invalid:ring-destructive/20 disabled:opacity-60";

/** Label + control + hint/error, wired with aria-describedby. */
export function Field({
  id,
  label,
  hint,
  error,
  optional,
  className,
  children,
}: {
  id: string;
  label: string;
  hint?: React.ReactNode;
  error?: string;
  optional?: boolean;
  className?: string;
  children: (props: {
    id: string;
    "aria-invalid"?: true;
    "aria-describedby"?: string;
  }) => React.ReactNode;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {optional && <span className="ml-1 font-normal text-muted-foreground">(optional)</span>}
      </label>
      {children({
        id,
        ...(error ? { "aria-invalid": true } : {}),
        "aria-describedby": describedBy,
      })}
      {error && (
        <p id={errorId} className="text-[13px] font-medium text-destructive">
          {error}
        </p>
      )}
      {hint && (
        <p id={hintId} className="text-[13px] text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(control, "h-12", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea className={cn(control, "min-h-28 py-3 leading-relaxed", className)} {...props} />
  );
}

export function Select({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        control,
        "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%238A7768' stroke-width='2' viewBox='0 0 24 24'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")] h-12 appearance-none bg-[right_0.9rem_center] bg-no-repeat pr-10",
        className,
      )}
      {...props}
    />
  );
}
