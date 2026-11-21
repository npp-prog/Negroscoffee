"use client";

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteShopAction, saveShopAction } from "@/app/admin/shops/[id]/actions";
import { HoursEditor } from "@/components/admin/hours-editor";
import { LocationPicker } from "@/components/admin/location-picker";
import { MenuEditor } from "@/components/admin/menu-editor";
import { FormError, SubmitButton, useFocusFirstError } from "@/components/forms/form-bits";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import {
  PRICE_TIERS,
  PRICE_TIER_META,
  PROVINCE_LABEL,
  SHOP_TYPES,
  SHOP_TYPE_META,
  type Province,
} from "@/lib/categories";
import type { AdminShop } from "@/lib/db";
import { IDLE } from "@/lib/forms";
import { slugify } from "@/lib/osm";
import { tierForLattePrice } from "@/lib/tier";

export type CityChoice = { id: string; name: string; province: Province };

function Section({
  title,
  children,
  aside,
}: {
  title: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-[20px] border bg-surface p-5 shadow-soft sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function ShopEditor({ shop, cities }: { shop: AdminShop | null; cities: CityChoice[] }) {
  const [state, action] = useActionState(saveShopAction, IDLE);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(state, formRef);
  const [deleting, startDelete] = useTransition();
  const v = state.values ?? {};
  const e = state.errors ?? {};
  const isNew = !shop;

  const [name, setName] = useState(v.name ?? shop?.name ?? "");
  const [slug, setSlug] = useState(v.slug ?? shop?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(!isNew);
  const [latte, setLatte] = useState(
    v.lattePrice ?? (shop?.lattePrice != null ? String(Math.round(shop.lattePrice)) : ""),
  );
  const [cityId, setCityId] = useState(v.cityId ?? shop?.cityId ?? "");
  const [province, setProvince] = useState<string>(v.province ?? shop?.province ?? "");
  const autoTier = tierForLattePrice(latte ? Number(latte) : null);
  const byProvince = useMemo(
    () => (p: Province) => cities.filter((c) => c.province === p),
    [cities],
  );

  // Tier stored on the row equals the auto value unless an admin overrode it.
  const storedTier = shop?.priceTier ?? null;
  const shopAuto = tierForLattePrice(shop?.lattePrice ?? null);
  const initialTier =
    v.priceTier ?? (storedTier && storedTier !== shopAuto ? String(storedTier) : "");

  useEffect(() => {
    if (state.status === "success") toast.success("Saved");
  }, [state]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="id" value={shop?.id ?? "new"} />
      <FormError message={e.form} />

      <Section
        title="Basics"
        aside={
          shop?.status === "published" ? (
            <Link
              href={`/shop/${shop.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1 text-sm font-medium hover:underline"
            >
              View public page <ExternalLink className="size-3.5" aria-hidden="true" />
            </Link>
          ) : null
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="name" label="Name" error={e.name}>
            {(p) => (
              <Input
                {...p}
                name="name"
                value={name}
                maxLength={120}
                onChange={(ev) => {
                  setName(ev.target.value);
                  if (!slugEdited) setSlug(slugify(ev.target.value));
                }}
              />
            )}
          </Field>
          <Field id="slug" label="URL slug" error={e.slug} hint={`/shop/${slug || "…"}`}>
            {(p) => (
              <Input
                {...p}
                name="slug"
                value={slug}
                maxLength={80}
                onChange={(ev) => {
                  setSlug(ev.target.value);
                  setSlugEdited(true);
                }}
              />
            )}
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field id="type" label="Type" error={e.type}>
            {(p) => (
              <Select {...p} name="type" defaultValue={v.type ?? shop?.type ?? ""}>
                <option value="">Not set</option>
                {SHOP_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {SHOP_TYPE_META[t].label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field id="lattePrice" label="12 oz latte (₱)" error={e.lattePrice}>
            {(p) => (
              <Input
                {...p}
                name="lattePrice"
                inputMode="numeric"
                value={latte}
                onChange={(ev) => setLatte(ev.target.value.replace(/[^\d]/g, ""))}
                className="tabular"
              />
            )}
          </Field>
          <Field
            id="priceTier"
            label="Price tier"
            error={e.priceTier}
            hint={
              autoTier
                ? `Auto: ${PRICE_TIER_META[autoTier].symbol} ${PRICE_TIER_META[autoTier].label}`
                : "Auto from latte price"
            }
          >
            {(p) => (
              <Select {...p} name="priceTier" defaultValue={initialTier}>
                <option value="">Auto</option>
                {PRICE_TIERS.map((t) => (
                  <option key={t} value={t}>
                    {PRICE_TIER_META[t].symbol} {PRICE_TIER_META[t].label} (override)
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="status"
            label="Status"
            error={e.status}
            hint="Published shops need a type, a tier and a province."
          >
            {(p) => (
              <Select {...p} name="status" defaultValue={v.status ?? shop?.status ?? "draft"}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="hidden">Hidden</option>
              </Select>
            )}
          </Field>
          <label className="flex min-h-11 items-center gap-3 self-end pb-3 text-sm font-medium">
            <input
              type="checkbox"
              name="verified"
              defaultChecked={v.verified ? v.verified === "on" : !!shop?.verifiedAt}
              className="size-5 accent-[var(--accent-brand)]"
            />
            Verified (shows a badge)
          </label>
        </div>
        <Field id="description" label="Description" optional error={e.description}>
          {(p) => (
            <Textarea
              {...p}
              name="description"
              maxLength={2000}
              defaultValue={v.description ?? shop?.description ?? ""}
            />
          )}
        </Field>
      </Section>

      <Section title="Location">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field id="cityId" label="Town or city" error={e.cityId}>
            {(p) => (
              <Select
                {...p}
                name="cityId"
                value={cityId}
                onChange={(ev) => {
                  setCityId(ev.target.value);
                  const c = cities.find((x) => x.id === ev.target.value);
                  if (c) setProvince(c.province);
                }}
              >
                <option value="">Not set</option>
                {(Object.keys(PROVINCE_LABEL) as Province[]).map((prov) => (
                  <optgroup key={prov} label={PROVINCE_LABEL[prov]}>
                    {byProvince(prov).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            )}
          </Field>
          <Field id="province" label="Province" error={e.province}>
            {(p) => (
              <Select
                {...p}
                name="province"
                value={province}
                onChange={(ev) => setProvince(ev.target.value)}
              >
                <option value="">Not set</option>
                {(Object.keys(PROVINCE_LABEL) as Province[]).map((prov) => (
                  <option key={prov} value={prov}>
                    {PROVINCE_LABEL[prov]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field id="address" label="Street / landmark" optional error={e.address}>
            {(p) => (
              <Input
                {...p}
                name="address"
                maxLength={200}
                defaultValue={v.address ?? shop?.address ?? ""}
              />
            )}
          </Field>
        </div>
        <LocationPicker
          initial={{
            lat: Number(v.lat) || shop?.lat || 10.6765,
            lng: Number(v.lng) || shop?.lng || 122.9509,
          }}
          errors={{ lat: e.lat, lng: e.lng }}
        />
      </Section>

      <Section title="Opening hours">
        <HoursEditor name="hours" initial={shop?.hours ?? null} />
        {e.hours && <p className="text-[13px] text-destructive">{e.hours}</p>}
      </Section>

      <Section title="Menu prices">
        <MenuEditor
          name="menu"
          initial={(shop?.menu ?? []).map((m) => ({
            name: m.name,
            price: Number(m.price),
            category: m.category,
          }))}
        />
        {e.menu && <p className="text-[13px] text-destructive">{e.menu}</p>}
      </Section>

      <Section title="Contact">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="phone" label="Phone" optional error={e.phone}>
            {(p) => (
              <Input {...p} name="phone" type="tel" defaultValue={v.phone ?? shop?.phone ?? ""} />
            )}
          </Field>
          <Field id="website" label="Website" optional error={e.website}>
            {(p) => (
              <Input
                {...p}
                name="website"
                inputMode="url"
                defaultValue={v.website ?? shop?.website ?? ""}
              />
            )}
          </Field>
          <Field id="facebookUrl" label="Facebook" optional error={e.facebookUrl}>
            {(p) => (
              <Input
                {...p}
                name="facebookUrl"
                inputMode="url"
                defaultValue={v.facebookUrl ?? shop?.facebookUrl ?? ""}
              />
            )}
          </Field>
          <Field id="instagramUrl" label="Instagram" optional error={e.instagramUrl}>
            {(p) => (
              <Input
                {...p}
                name="instagramUrl"
                inputMode="url"
                defaultValue={v.instagramUrl ?? shop?.instagramUrl ?? ""}
              />
            )}
          </Field>
          <Field
            id="googlePlaceId"
            label="Google Place ID"
            optional
            error={e.googlePlaceId}
            hint="Only the ID is stored (no other Google data)."
          >
            {(p) => (
              <Input
                {...p}
                name="googlePlaceId"
                defaultValue={v.googlePlaceId ?? shop?.googlePlaceId ?? ""}
              />
            )}
          </Field>
        </div>
      </Section>

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t bg-background/90 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border">
        {shop ? (
          <Button
            type="button"
            variant="ghost"
            disabled={deleting}
            onClick={() => {
              if (!confirm(`Delete ${shop.name}? This removes its photos and menu too.`)) return;
              startDelete(async () => {
                const res = await deleteShopAction(shop.id);
                if (res && !res.ok) toast.error(res.error ?? "Delete failed");
              });
            }}
          >
            <Trash2 /> Delete shop
          </Button>
        ) : (
          <span />
        )}
        <SubmitButton>{isNew ? "Create shop" : "Save changes"}</SubmitButton>
      </div>
    </form>
  );
}
