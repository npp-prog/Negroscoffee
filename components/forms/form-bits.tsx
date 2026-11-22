"use client";

import { useEffect, useRef, type RefObject } from "react";

import type { FormState } from "@/lib/forms";
import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { CupIllustration } from "@/components/brand/cup-illustration";
import { Button } from "@/components/ui/button";

/** Honeypot + time spent on the form. Hidden from people and assistive tech. */
export function SpamGuard() {
  // Measured in the browser with a monotonic clock, so a wrong device clock doesn't matter.
  const elapsed = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const t0 = performance.now();
    const tick = () => {
      if (elapsed.current) elapsed.current.value = String(Math.round(performance.now() - t0));
    };
    tick();
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, []);
  return (
    <>
      <input ref={elapsed} type="hidden" name="elapsedMs" defaultValue="" />
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Leave this empty
          <input type="text" name="website_hp" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>
    </>
  );
}

export function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="crema" size="lg" disabled={pending} className="w-full sm:w-auto">
      {pending && <LoaderCircle className="animate-spin" aria-hidden="true" />}
      {pending ? "Sending…" : children}
    </Button>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-medium"
    >
      {message}
    </p>
  );
}

export function SuccessPanel({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      role="status"
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
      className="flex flex-col items-center gap-3 rounded-[20px] border bg-surface px-6 py-10 text-center shadow-soft"
    >
      <CupIllustration className="w-28" />
      <h2 className="text-2xl font-semibold">{title}</h2>
      <p className="max-w-sm text-muted-foreground">{body}</p>
      {children && <div className="mt-2 flex flex-wrap justify-center gap-2">{children}</div>}
    </motion.div>
  );
}

/** After a failed submit, move focus to the first invalid field (or the form-level error). */
export function useFocusFirstError(state: FormState, form: RefObject<HTMLFormElement | null>) {
  useEffect(() => {
    if (state.status !== "error") return;
    const el = form.current?.querySelector<HTMLElement>('[aria-invalid="true"], p[role="alert"]');
    if (!el) return;
    if (el.tagName === "P") el.setAttribute("tabindex", "-1");
    el.focus({ preventScroll: false });
  }, [state, form]);
}
