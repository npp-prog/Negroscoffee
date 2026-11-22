import "server-only";

import { MIN_FILL_SECONDS, type FormState } from "@/lib/forms";
import { getServerSupabase } from "@/lib/supabase/server";

/** Text fields of a FormData (files dropped), for echoing back into the form. */
export function textValues(form: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of form) if (typeof v === "string" && k !== "website_hp") out[k] = v;
  return out;
}

/** Honeypot + minimum fill time. Returns an error state when the post looks automated. */
export function botCheck(form: FormData): FormState | null {
  const honeypot = form.get("website_hp");
  // elapsedMs is kept up to date by the browser while the form is open; missing means a script.
  const raw = form.get("elapsedMs");
  const elapsed = typeof raw === "string" && raw !== "" ? Number(raw) : NaN;
  const tooFast = !Number.isFinite(elapsed) || elapsed < MIN_FILL_SECONDS * 1000;
  if ((typeof honeypot === "string" && honeypot !== "") || tooFast) {
    return {
      status: "error",
      errors: { form: "That was quick! Please check the form and try again." },
    };
  }
  return null;
}

export function fileField(form: FormData, name: string): File | null {
  const v = form.get(name);
  return v instanceof File && v.size > 0 ? v : null;
}

/** Supabase client acting as the visitor (RLS applies) plus who they are, if signed in. */
export async function visitor() {
  const db = await getServerSupabase();
  const { data } = await db.auth.getUser();
  const user = data.user;
  return {
    db,
    submitter: {
      id: user?.id ?? null,
      email: user?.email ?? undefined,
      name: (user?.user_metadata?.full_name as string | undefined) ?? undefined,
    },
  };
}

export function serverError(err: unknown, values: Record<string, string>): FormState {
  if (err instanceof Error && err.message.includes("submission_limit")) {
    return {
      status: "error",
      values,
      errors: { form: "We've received a lot from you recently. Please try again in an hour." },
    };
  }
  console.error("[submission]", err);
  return {
    status: "error",
    values,
    errors: { form: "Something went wrong on our side. Please try again in a moment." },
  };
}
