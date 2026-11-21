/** Shared form action state (client + server). */
export type FormState = {
  status: "idle" | "error" | "success";
  /** Field name → first error message; "form" for errors not tied to a field. */
  errors?: Record<string, string>;
  /** Submitted text values, echoed back so the form keeps them after a failed submit. */
  values?: Record<string, string>;
};

export const IDLE: FormState = { status: "idle" };

/** Seconds a person needs at least to fill a form; faster posts are treated as bots. */
export const MIN_FILL_SECONDS = 3;
