"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import { LocateFixed } from "lucide-react";

import { suggestShopAction } from "@/app/suggest/actions";
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
import {
  PRICE_TIER_META,
  PROVINCE_LABEL,
  SHOP_TYPES,
  SHOP_TYPE_META,
  type Province,
} from "@/lib/categories";
import { IDLE } from "@/lib/forms";
import { tierForLattePrice } from "@/lib/tier";

export type CityOption = { slug: string; name: string; province: Province };

export function SuggestForm({ cities }: { cities: CityOption[] }) {
  const [state, action] = useActionState(suggestShopAction, IDLE);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(state, formRef);
  const [latte, setLatte] = useState("");
  const [locating, setLocating] = useState(false);
  const [location, setLocation] = useState<string | null>(null);
  const v = state.values ?? {};
  const e = state.errors ?? {};

  if (state.status === "success") {
    return (
      <SuccessPanel
        title="Salamat! Suggestion received"
        body="We'll check the details and add the shop to the map once it's verified."
      >
        <Button asChild variant="crema">
          <Link href="/">Back to the map</Link>
        </Button>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Suggest another
        </Button>
      </SuccessPanel>
    );
  }

  const tier = tierForLattePrice(Number(latte || v.lattePrice) || null);
  const byProvince = (p: Province) => cities.filter((c) => c.province === p);

  function locateMe() {
    if (!("geolocation" in navigator)) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation(`${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  return (
    <form ref={formRef} action={action} className="relative flex flex-col gap-6" noValidate>
      <SpamGuard />
      <FormError message={e.form} />

      <fieldset className="flex flex-col gap-5">
        <legend className="mb-3 text-lg font-semibold">The shop</legend>
        <Field id="name" label="Shop name" error={e.name}>
          {(p) => (
            <Input
              {...p}
              name="name"
              required
              maxLength={120}
              defaultValue={v.name}
              autoComplete="off"
            />
          )}
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="type" label="Type" optional error={e.type}>
            {(p) => (
              <Select {...p} name="type" defaultValue={v.type ?? ""}>
                <option value="">Not sure</option>
                {SHOP_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {SHOP_TYPE_META[t].label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field
            id="lattePrice"
            label="12 oz hot latte price (₱)"
            optional
            error={e.lattePrice}
            hint={
              tier
                ? `${PRICE_TIER_META[tier].symbol} ${PRICE_TIER_META[tier].label}`
                : "Sets the price tier"
            }
          >
            {(p) => (
              <Input
                {...p}
                name="lattePrice"
                inputMode="numeric"
                pattern="[0-9]*"
                defaultValue={v.lattePrice}
                onChange={(ev) => setLatte(ev.target.value)}
                className="tabular"
              />
            )}
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="citySlug" label="Town or city" optional error={e.citySlug}>
            {(p) => (
              <Select {...p} name="citySlug" defaultValue={v.citySlug ?? ""}>
                <option value="">Choose…</option>
                {(Object.keys(PROVINCE_LABEL) as Province[]).map((prov) => (
                  <optgroup key={prov} label={PROVINCE_LABEL[prov]}>
                    {byProvince(prov).map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            )}
          </Field>
          <Field id="address" label="Street or landmark" optional error={e.address}>
            {(p) => <Input {...p} name="address" maxLength={200} defaultValue={v.address} />}
          </Field>
        </div>

        <Field
          id="location"
          label="Location"
          optional
          error={e.location}
          hint="Paste a Google Maps link, or tap the button if you're at the shop."
        >
          {(p) => (
            <div className="flex gap-2">
              <Input
                {...p}
                key={location ?? "initial"}
                name="location"
                defaultValue={location ?? v.location}
                placeholder="https://maps.app.goo.gl/… or 10.6765, 122.9509"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={locateMe}
                disabled={locating}
                aria-label="Use my current location"
              >
                <LocateFixed className={locating ? "animate-pulse" : undefined} />
              </Button>
            </div>
          )}
        </Field>

        <Field
          id="hours"
          label="Opening hours"
          optional
          error={e.hours}
          hint="e.g. Daily 7 AM – 9 PM, closed Sundays"
        >
          {(p) => <Input {...p} name="hours" maxLength={300} defaultValue={v.hours} />}
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="facebook" label="Facebook page" optional error={e.facebook}>
            {(p) => (
              <Input
                {...p}
                name="facebook"
                inputMode="url"
                defaultValue={v.facebook}
                placeholder="facebook.com/…"
              />
            )}
          </Field>
          <Field id="instagram" label="Instagram" optional error={e.instagram}>
            {(p) => (
              <Input
                {...p}
                name="instagram"
                inputMode="url"
                defaultValue={v.instagram}
                placeholder="instagram.com/…"
              />
            )}
          </Field>
        </div>

        <Field
          id="photo"
          label="A photo of the shop or menu"
          optional
          error={e.photo}
          hint="Helps us verify it. JPG, PNG or WebP."
        >
          {(p) => (
            <PhotoInput
              id={p.id}
              name="photo"
              invalid={!!e.photo}
              describedBy={p["aria-describedby"]}
            />
          )}
        </Field>

        <Field id="notes" label="Anything else?" optional error={e.notes}>
          {(p) => (
            <Textarea
              {...p}
              name="notes"
              maxLength={1000}
              defaultValue={v.notes}
              placeholder="Best drink, Wi-Fi, parking…"
            />
          )}
        </Field>
      </fieldset>

      <fieldset className="flex flex-col gap-5">
        <legend className="mb-1 text-lg font-semibold">About you</legend>
        <p className="-mt-2 text-sm text-muted-foreground">
          Optional. Only used if we have a question.
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="submitterName" label="Name" optional error={e.submitterName}>
            {(p) => (
              <Input
                {...p}
                name="submitterName"
                autoComplete="name"
                defaultValue={v.submitterName}
              />
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
      </fieldset>

      <SubmitButton>Send suggestion</SubmitButton>
    </form>
  );
}
