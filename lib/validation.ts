/**
 * Zod schemas for public forms (suggest, correction, claim). Shared by the web app and the
 * future Expo app; keep free of framework imports.
 */
import { z } from "zod";

import { SHOP_TYPES } from "./categories";

const trimmed = (max: number) => z.string().trim().max(max, `Keep it under ${max} characters`);
const optionalText = (max: number) =>
  trimmed(max)
    .optional()
    .transform((v) => (v ? v : undefined));

const optionalUrl = optionalText(300).refine(
  (v) => !v || /^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(v),
  "Enter a link like facebook.com/yourshop",
);

const optionalEmail = optionalText(200).refine(
  (v) => !v || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v),
  "Enter a valid email",
);

const optionalPrice = z
  .union([
    z.literal(""),
    z.coerce.number().min(10, "That seems too low").max(2000, "That seems too high"),
  ])
  .optional()
  .transform((v) => (v === "" || v == null ? undefined : Math.round(v)));

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** "10.6765, 122.9509" or a Google/OSM/Apple maps link containing coordinates. */
export function parseLocationInput(text: string | undefined): { lat: number; lng: number } | null {
  if (!text) return null;
  const decoded = decodeURIComponent(text);
  const patterns = [
    /@(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)/, // google.com/maps/@lat,lng,17z
    /[?&](?:q|ll|query|destination|mlat)=(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)/, // ?q=lat,lng
    /!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/, // google place data
    /^\s*(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)\s*$/, // plain "lat, lng"
  ];
  for (const re of patterns) {
    const m = decoded.match(re);
    if (m) {
      const lat = Number(m[1]);
      const lng = Number(m[2]);
      // Rough Negros + surroundings guard.
      if (lat > 8.5 && lat < 11.6 && lng > 121.8 && lng < 124.2) return { lat, lng };
    }
  }
  return null;
}

const locationField = optionalText(500).refine(
  (v) => !v || parseLocationInput(v) !== null,
  "Paste a Google Maps link or coordinates on Negros (e.g. 10.6765, 122.9509)",
);

/** Shared contact + anti-spam fields. */
const submitterFields = {
  submitterName: optionalText(120),
  submitterEmail: optionalEmail,
  /** Honeypot: real people never fill this. */
  website_hp: z.string().max(0, "Spam check failed").optional(),
};

export const suggestShopSchema = z.object({
  name: trimmed(120).min(2, "Enter the shop's name"),
  type: z
    .enum(SHOP_TYPES)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  lattePrice: optionalPrice,
  citySlug: z
    .string()
    .regex(SLUG, "Choose a town")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  address: optionalText(200),
  location: locationField,
  hours: optionalText(300),
  facebook: optionalUrl,
  instagram: optionalUrl,
  notes: optionalText(1000),
  ...submitterFields,
});
export type SuggestShopInput = z.infer<typeof suggestShopSchema>;

export const correctionSchema = z
  .object({
    shopSlug: z.string().regex(SLUG),
    details: optionalText(1500),
    lattePrice: optionalPrice,
    hours: optionalText(300),
    permanentlyClosed: z
      .union([z.literal("on"), z.literal("true"), z.literal("")])
      .optional()
      .transform((v) => v === "on" || v === "true"),
    ...submitterFields,
  })
  .refine((v) => v.details || v.lattePrice || v.hours || v.permanentlyClosed, {
    message: "Tell us what to change",
    path: ["details"],
  });
export type CorrectionInput = z.infer<typeof correctionSchema>;

export const CLAIM_ROLES = ["owner", "manager", "staff"] as const;

export const claimSchema = z.object({
  shopSlug: z.string().regex(SLUG),
  submitterName: trimmed(120).min(2, "Enter your name"),
  submitterEmail: trimmed(200).regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, "Enter a valid email"),
  phone: optionalText(40).refine(
    (v) => !v || /^[+\d][\d\s()-]{6,}$/.test(v),
    "Enter a valid phone number",
  ),
  role: z.enum(CLAIM_ROLES, { message: "Choose your role" }),
  message: optionalText(1000),
  consent: z.literal("on", { message: "Please confirm you're authorized to manage this shop" }),
  website_hp: submitterFields.website_hp,
});
export type ClaimInput = z.infer<typeof claimSchema>;

// --- uploads --------------------------------------------------------------------------------

export const PROOF_MAX_BYTES = 3 * 1024 * 1024;
export const PROOF_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/** Validate an uploaded image (File from FormData). Returns an error message or null. */
export function checkImage(
  file: { size: number; type: string } | null,
  required: boolean,
): string | null {
  if (!file || file.size === 0) return required ? "Add a photo" : null;
  if (!(PROOF_TYPES as readonly string[]).includes(file.type))
    return "Use a JPG, PNG or WebP photo";
  if (file.size > PROOF_MAX_BYTES) return "Photo is too large (max 3 MB)";
  return null;
}

/** Flatten Zod issues into { field: firstMessage }. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

// --- admin shop editor ------------------------------------------------------------------------

const nullableText = (max: number) =>
  trimmed(max)
    .optional()
    .transform((v) => (v ? v : null));

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const CLOSE_RE = /^(([01]\d|2[0-3]):[0-5]\d|24:00)$/;
const rangeSchema = z.object({
  open: z.string().regex(TIME_RE),
  close: z.string().regex(CLOSE_RE),
});
const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

/** Hours JSON from the editor: { mon: [{open, close}], ... }; missing day = unknown. */
export const hoursJsonSchema = z
  .string()
  .optional()
  .transform((s, ctx) => {
    if (!s) return null;
    try {
      return JSON.parse(s) as unknown;
    } catch {
      ctx.addIssue({ code: "custom", message: "Invalid hours" });
      return z.NEVER;
    }
  })
  .pipe(z.partialRecord(z.enum(DAY_KEYS), z.array(rangeSchema).max(4)).nullable())
  .transform((h) => (h && Object.keys(h).length ? h : null));

export const menuJsonSchema = z
  .string()
  .optional()
  .transform((s, ctx) => {
    if (!s) return [];
    try {
      return JSON.parse(s) as unknown;
    } catch {
      ctx.addIssue({ code: "custom", message: "Invalid menu" });
      return z.NEVER;
    }
  })
  .pipe(
    z
      .array(
        z.object({
          name: z.string().trim().min(1, "Menu item needs a name").max(80),
          price: z.preprocess(
            (v) => (v === "" || v == null ? undefined : v),
            z.coerce
              .number({ message: "Each menu item needs a price" })
              .min(0, "Price can't be negative")
              .max(100000),
          ),
          category: z
            .string()
            .trim()
            .max(40)
            .nullish()
            .transform((v) => v || null),
        }),
      )
      .max(100, "Keep the menu under 100 items"),
  );

export const adminShopSchema = z.object({
  name: trimmed(120).min(1, "Name is required"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(SLUG, "Use lowercase letters, numbers and dashes")
    .max(80),
  type: z
    .enum(SHOP_TYPES)
    .optional()
    .or(z.literal("").transform(() => undefined))
    .transform((v) => v ?? null),
  lattePrice: optionalPrice.transform((v) => v ?? null),
  priceTier: z
    .enum(["", "1", "2", "3", "4"])
    .optional()
    .transform((v) => (v ? (Number(v) as 1 | 2 | 3 | 4) : null)),
  status: z.enum(["draft", "published", "hidden"]),
  verified: z
    .literal("on")
    .optional()
    .transform((v) => v === "on"),
  description: nullableText(2000),
  address: nullableText(200),
  cityId: z
    .string()
    .uuid()
    .optional()
    .or(z.literal("").transform(() => undefined))
    .transform((v) => v ?? null),
  province: z
    .enum(["negros_occidental", "negros_oriental"])
    .optional()
    .or(z.literal("").transform(() => undefined))
    .transform((v) => v ?? null),
  lat: z.coerce
    .number({ message: "Set the location" })
    .min(8.5, "Location must be on Negros")
    .max(11.6, "Location must be on Negros"),
  lng: z.coerce
    .number({ message: "Set the location" })
    .min(121.8, "Location must be on Negros")
    .max(124.2, "Location must be on Negros"),
  hours: hoursJsonSchema,
  menu: menuJsonSchema,
  phone: nullableText(40),
  facebookUrl: nullableText(300),
  instagramUrl: nullableText(300),
  website: nullableText(300),
  googlePlaceId: nullableText(300).refine(
    (v) => !v || /^[\w-]{10,}$/.test(v),
    "Paste only the Place ID (e.g. ChIJ…)",
  ),
});
export type AdminShopInput = z.infer<typeof adminShopSchema>;

/** What a verified owner may edit (a subset of the admin editor). */
export const ownerShopSchema = adminShopSchema.pick({
  description: true,
  lattePrice: true,
  hours: true,
  menu: true,
  phone: true,
  website: true,
  facebookUrl: true,
  instagramUrl: true,
});
export type OwnerShopInput = z.infer<typeof ownerShopSchema>;
