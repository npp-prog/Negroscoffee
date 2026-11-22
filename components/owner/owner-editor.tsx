"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { toast } from "sonner";

import { saveOwnerShopAction } from "@/app/owner/actions";
import { HoursEditor } from "@/components/admin/hours-editor";
import { MenuEditor } from "@/components/admin/menu-editor";
import { FormError, SubmitButton, useFocusFirstError } from "@/components/forms/form-bits";
import { TypeChip } from "@/components/shop/type-chip";
import { Field, Input, Textarea } from "@/components/ui/field";
import { PRICE_TIER_META } from "@/lib/categories";
import type { AdminShop } from "@/lib/db";
import { IDLE } from "@/lib/forms";
import { tierForLattePrice } from "@/lib/tier";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-[20px] border bg-surface p-5 shadow-soft sm:p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

/** What a verified owner can change. Name, type, location and status are admin-managed. */
export function OwnerEditor({ shop }: { shop: AdminShop }) {
  const [state, action] = useActionState(saveOwnerShopAction, IDLE);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(state, formRef);
  const v = state.values ?? {};
  const e = state.errors ?? {};
  const [latte, setLatte] = useState(
    v.lattePrice ?? (shop.lattePrice != null ? String(Math.round(shop.lattePrice)) : ""),
  );
  const tier = tierForLattePrice(latte ? Number(latte) : null);

  useEffect(() => {
    if (state.status === "success") toast.success("Saved. Your changes are live.");
  }, [state]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="id" value={shop.id} />
      <FormError message={e.form} />

      <Section title="Prices">
        <Field
          id="lattePrice"
          label="12 oz hot latte (₱)"
          error={e.lattePrice}
          hint={
            tier
              ? `Shows as ${PRICE_TIER_META[tier].symbol} ${PRICE_TIER_META[tier].label} on the map`
              : "Sets your price tier on the map"
          }
        >
          {(p) => (
            <Input
              {...p}
              name="lattePrice"
              inputMode="numeric"
              value={latte}
              onChange={(ev) => setLatte(ev.target.value.replace(/[^\d]/g, ""))}
              className="max-w-48 tabular"
            />
          )}
        </Field>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Menu</span>
          <MenuEditor
            name="menu"
            initial={shop.menu.map((m) => ({
              name: m.name,
              price: Number(m.price),
              category: m.category,
            }))}
          />
          {e.menu && <p className="text-[13px] text-destructive">{e.menu}</p>}
        </div>
      </Section>

      <Section title="Opening hours">
        <HoursEditor name="hours" initial={shop.hours} />
        {e.hours && <p className="text-[13px] text-destructive">{e.hours}</p>}
      </Section>

      <Section title="About your shop">
        <Field
          id="description"
          label="Description"
          optional
          error={e.description}
          hint="What makes your coffee special? Up to 2,000 characters."
        >
          {(p) => (
            <Textarea
              {...p}
              name="description"
              maxLength={2000}
              defaultValue={v.description ?? shop.description ?? ""}
            />
          )}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="phone" label="Phone" optional error={e.phone}>
            {(p) => (
              <Input {...p} name="phone" type="tel" defaultValue={v.phone ?? shop.phone ?? ""} />
            )}
          </Field>
          <Field id="website" label="Website" optional error={e.website}>
            {(p) => (
              <Input
                {...p}
                name="website"
                inputMode="url"
                defaultValue={v.website ?? shop.website ?? ""}
              />
            )}
          </Field>
          <Field id="facebookUrl" label="Facebook" optional error={e.facebookUrl}>
            {(p) => (
              <Input
                {...p}
                name="facebookUrl"
                inputMode="url"
                defaultValue={v.facebookUrl ?? shop.facebookUrl ?? ""}
              />
            )}
          </Field>
          <Field id="instagramUrl" label="Instagram" optional error={e.instagramUrl}>
            {(p) => (
              <Input
                {...p}
                name="instagramUrl"
                inputMode="url"
                defaultValue={v.instagramUrl ?? shop.instagramUrl ?? ""}
              />
            )}
          </Field>
        </div>
      </Section>

      <section className="flex flex-col gap-2 rounded-[20px] border border-dashed p-5 text-sm">
        <h2 className="flex items-center gap-2 font-semibold">
          <Lock className="size-4" aria-hidden="true" /> Managed by Kape Negros
        </h2>
        <p className="text-muted-foreground">
          {shop.type && <TypeChip type={shop.type} className="mr-1" />} Name, shop type, address and
          map pin are checked by our team. Need a change?{" "}
          <Link
            href={`/suggest?shop=${shop.slug}`}
            className="font-medium text-foreground underline underline-offset-2"
          >
            Request it here
          </Link>
          .
        </p>
      </section>

      <div className="sticky bottom-0 z-10 -mx-4 flex justify-end border-t bg-background/90 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border">
        <SubmitButton>Save changes</SubmitButton>
      </div>
    </form>
  );
}
