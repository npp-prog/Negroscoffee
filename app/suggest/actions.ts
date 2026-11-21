"use server";

import { submitCorrection, submitNewShop, uploadSubmissionPhoto } from "@/lib/db";
import type { FormState } from "@/lib/forms";
import { botCheck, fileField, serverError, textValues, visitor } from "@/lib/submissions-server";
import { checkImage, correctionSchema, fieldErrors, suggestShopSchema } from "@/lib/validation";

export async function suggestShopAction(_prev: FormState, form: FormData): Promise<FormState> {
  const values = textValues(form);
  const bot = botCheck(form);
  if (bot) return { ...bot, values };

  const parsed = suggestShopSchema.safeParse(values);
  const photo = fileField(form, "photo");
  const photoError = checkImage(photo, false);
  if (!parsed.success || photoError) {
    return {
      status: "error",
      values,
      errors: {
        ...(parsed.success ? {} : fieldErrors(parsed.error)),
        ...(photoError ? { photo: photoError } : {}),
      },
    };
  }

  try {
    const { db, submitter } = await visitor();
    const path = photo ? await uploadSubmissionPhoto(db, "suggestions", photo) : null;
    await submitNewShop(db, parsed.data, submitter, path);
    return { status: "success" };
  } catch (err) {
    return serverError(err, values);
  }
}

export async function correctionAction(_prev: FormState, form: FormData): Promise<FormState> {
  const values = textValues(form);
  const bot = botCheck(form);
  if (bot) return { ...bot, values };

  const parsed = correctionSchema.safeParse(values);
  const photo = fileField(form, "photo");
  const photoError = checkImage(photo, false);
  if (!parsed.success || photoError) {
    return {
      status: "error",
      values,
      errors: {
        ...(parsed.success ? {} : fieldErrors(parsed.error)),
        ...(photoError ? { photo: photoError } : {}),
      },
    };
  }

  try {
    const { db, submitter } = await visitor();
    const path = photo ? await uploadSubmissionPhoto(db, "suggestions", photo) : null;
    const result = await submitCorrection(db, parsed.data, submitter, path);
    if (result === "shop-not-found") {
      return { status: "error", values, errors: { form: "We couldn't find that shop anymore." } };
    }
    return { status: "success" };
  } catch (err) {
    return serverError(err, values);
  }
}
