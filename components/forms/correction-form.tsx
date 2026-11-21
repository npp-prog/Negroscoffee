"use client";

import { useActionState, useRef } from "react";
import Link from "next/link";

import { correctionAction } from "@/app/suggest/actions";
import {
  FormError,
  SpamGuard,
  SubmitButton,
  SuccessPanel,
  useFocusFirstError,
} from "@/components/forms/form-bits";
import { PhotoInput } from "@/components/forms/photo-input";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { IDLE } from "@/lib/forms";

export function CorrectionForm({ shop }: { shop: { slug: string; name: string } }) {
  const [state, action] = useActionState(correctionAction, IDLE);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(state, formRef);
  const v = state.values ?? {};
  const e = state.errors ?? {};

  if (state.status === "success") {
    return (
      <SuccessPanel
        title="Salamat! We'll take a look"
        body={`We'll review your update to ${shop.name} and fix the listing.`}
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

      <Field id="details" label="What should we change?" error={e.details}>
        {(p) => (
          <Textarea
            {...p}
            name="details"
            maxLength={1500}
            defaultValue={v.details}
            placeholder="New address, phone number, menu changes…"
          />
        )}
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="lattePrice" label="Current 12 oz latte price (₱)" optional error={e.lattePrice}>
          {(p) => (
            <Input
              {...p}
              name="lattePrice"
              inputMode="numeric"
              pattern="[0-9]*"
              defaultValue={v.lattePrice}
              className="tabular"
            />
          )}
        </Field>
        <Field id="hours" label="Opening hours" optional error={e.hours}>
          {(p) => (
            <Input
              {...p}
              name="hours"
              maxLength={300}
              defaultValue={v.hours}
              placeholder="e.g. Mon–Sat 7 AM – 8 PM"
            />
          )}
        </Field>
      </div>
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input
          type="checkbox"
          name="permanentlyClosed"
          defaultChecked={v.permanentlyClosed === "on"}
          className="size-5 rounded accent-[var(--accent-brand)]"
        />
        This shop has closed permanently
      </label>
      <Field id="photo" label="Photo (menu, signage…)" optional error={e.photo}>
        {(p) => (
          <PhotoInput
            id={p.id}
            name="photo"
            invalid={!!e.photo}
            describedBy={p["aria-describedby"]}
          />
        )}
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="submitterName" label="Your name" optional error={e.submitterName}>
          {(p) => (
            <Input {...p} name="submitterName" autoComplete="name" defaultValue={v.submitterName} />
          )}
        </Field>
        <Field id="submitterEmail" label="Email" optional error={e.submitterEmail}>
          {(p) => (
            <Input
              {...p}
              name="submitterEmail"
              type="email"
              autoComplete="email"
              defaultValue={v.submitterEmail}
            />
          )}
        </Field>
      </div>
      <SubmitButton>Send update</SubmitButton>
    </form>
  );
}
