"use client";

import { useActionState, useRef } from "react";
import Link from "next/link";

import { claimAction } from "@/app/claim/[slug]/actions";
import {
  FormError,
  SpamGuard,
  SubmitButton,
  SuccessPanel,
  useFocusFirstError,
} from "@/components/forms/form-bits";
import { PhotoInput } from "@/components/forms/photo-input";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { IDLE } from "@/lib/forms";
import { CLAIM_ROLES } from "@/lib/validation";

const ROLE_LABEL: Record<(typeof CLAIM_ROLES)[number], string> = {
  owner: "Owner",
  manager: "Manager",
  staff: "Staff (authorized by the owner)",
};

export function ClaimForm({ shop }: { shop: { slug: string; name: string } }) {
  const [state, action] = useActionState(claimAction, IDLE);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(state, formRef);
  const v = state.values ?? {};
  const e = state.errors ?? {};

  if (state.status === "success") {
    return (
      <SuccessPanel
        title="Claim received"
        body={`We'll verify your proof and email you about ${shop.name}, usually within a few days.`}
      >
        <Button asChild variant="crema">
          <Link href={`/shop/${shop.slug}`}>Back to {shop.name}</Link>
        </Button>
      </SuccessPanel>
    );
  }

  return (
    <form ref={formRef} action={action} className="relative flex flex-col gap-5" noValidate>
      <SpamGuard />
      <input type="hidden" name="shopSlug" value={shop.slug} />
      <FormError message={e.form} />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="submitterName" label="Your name" error={e.submitterName}>
          {(p) => (
            <Input
              {...p}
              name="submitterName"
              required
              autoComplete="name"
              defaultValue={v.submitterName}
            />
          )}
        </Field>
        <Field id="role" label="Your role" error={e.role}>
          {(p) => (
            <Select {...p} name="role" required defaultValue={v.role ?? ""}>
              <option value="" disabled>
                Choose…
              </option>
              {CLAIM_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          id="submitterEmail"
          label="Email"
          error={e.submitterEmail}
          hint="We'll send the result here."
        >
          {(p) => (
            <Input
              {...p}
              name="submitterEmail"
              type="email"
              required
              autoComplete="email"
              defaultValue={v.submitterEmail}
            />
          )}
        </Field>
        <Field id="phone" label="Phone" optional error={e.phone}>
          {(p) => (
            <Input
              {...p}
              name="phone"
              type="tel"
              autoComplete="tel"
              defaultValue={v.phone}
              placeholder="0917 …"
            />
          )}
        </Field>
      </div>
      <Field
        id="proof"
        label="Proof you run this shop"
        error={e.proof}
        hint="A photo of your business permit or DTI registration, or of you at the counter with the signage. Only our admins see it."
      >
        {(p) => (
          <PhotoInput
            id={p.id}
            name="proof"
            required
            invalid={!!e.proof}
            describedBy={p["aria-describedby"]}
            label="Add proof"
          />
        )}
      </Field>
      <Field id="message" label="Message" optional error={e.message}>
        {(p) => (
          <Textarea
            {...p}
            name="message"
            maxLength={1000}
            defaultValue={v.message}
            placeholder="Anything that helps us verify you"
          />
        )}
      </Field>
      <div className="flex flex-col gap-1.5">
        <label className="flex min-h-11 items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="consent"
            required
            aria-invalid={e.consent ? true : undefined}
            aria-describedby={e.consent ? "consent-error" : undefined}
            className="mt-0.5 size-5 shrink-0 rounded accent-[var(--accent-brand)]"
          />
          I own or am authorized to manage {shop.name}, and the information I give is true.
        </label>
        {e.consent && (
          <p id="consent-error" className="text-[13px] font-medium text-destructive">
            {e.consent}
          </p>
        )}
      </div>
      <SubmitButton>Send claim</SubmitButton>
    </form>
  );
}
