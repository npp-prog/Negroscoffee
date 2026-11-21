"use server";

import { submitClaim, uploadSubmissionPhoto } from "@/lib/db";
import type { FormState } from "@/lib/forms";
import { botCheck, fileField, serverError, textValues, visitor } from "@/lib/submissions-server";
import { checkImage, claimSchema, fieldErrors } from "@/lib/validation";

export async function claimAction(_prev: FormState, form: FormData): Promise<FormState> {
  const values = textValues(form);
  const bot = botCheck(form);
  if (bot) return { ...bot, values };

  const parsed = claimSchema.safeParse(values);
  const proof = fileField(form, "proof");
  const proofError = checkImage(proof, true);
  if (!parsed.success || proofError) {
    return {
      status: "error",
      values,
      errors: {
        ...(parsed.success ? {} : fieldErrors(parsed.error)),
        ...(proofError ? { proof: proofError } : {}),
      },
    };
  }

  try {
    const { db, submitter } = await visitor();
    const path = await uploadSubmissionPhoto(db, "claims", proof!);
    const result = await submitClaim(db, parsed.data, submitter, path);
    if (result === "shop-not-found") {
      return { status: "error", values, errors: { form: "We couldn't find that shop anymore." } };
    }
    return { status: "success" };
  } catch (err) {
    return serverError(err, values);
  }
}
