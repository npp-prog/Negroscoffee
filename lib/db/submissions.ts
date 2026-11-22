import type { ClaimInput, CorrectionInput, SuggestShopInput } from "../validation";
import { parseLocationInput } from "../location";
import { unwrap, type Db } from "./client";
import type { Json } from "./types";

type Submitter = { id: string | null; name?: string; email?: string };

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Upload a photo to the private `submission-proofs` bucket (anon may upload under
 * `claims/` and `suggestions/`). Returns the storage path to store on the submission.
 */
export async function uploadSubmissionPhoto(
  db: Db,
  folder: "claims" | "suggestions",
  file: Blob & { type: string },
): Promise<string> {
  const ext = EXT[file.type];
  if (!ext) throw new Error("Unsupported image type");
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await db.storage
    .from("submission-proofs")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(error.message);
  return path;
}

async function shopIdBySlug(db: Db, slug: string): Promise<string | null> {
  const row = unwrap<{ id: string } | null>(
    await db.from("shops").select("id").eq("slug", slug).eq("status", "published").maybeSingle(),
  );
  return row?.id ?? null;
}

/** Strip undefined so the jsonb payload stays tidy. */
function payload(obj: Record<string, unknown>): { [key: string]: Json } {
  return JSON.parse(JSON.stringify(obj));
}

// Inserts don't read the row back: anon has no SELECT on submissions (RLS).

export async function submitNewShop(
  db: Db,
  input: SuggestShopInput,
  submitter: Submitter,
  photoPath: string | null,
): Promise<void> {
  const location = parseLocationInput(input.location);
  unwrap(
    await db.from("submissions").insert({
      kind: "new_shop",
      payload: payload({
        name: input.name,
        type: input.type,
        latte_price: input.lattePrice,
        city_slug: input.citySlug,
        address: input.address,
        location,
        location_input: input.location,
        hours: input.hours,
        facebook_url: input.facebook,
        instagram_url: input.instagram,
        notes: input.notes,
      }),
      submitter_id: submitter.id,
      submitter_name: submitter.name ?? input.submitterName ?? null,
      submitter_email: submitter.email ?? input.submitterEmail ?? null,
      proof_url: photoPath,
    }),
  );
}

export async function submitCorrection(
  db: Db,
  input: CorrectionInput,
  submitter: Submitter,
  photoPath: string | null,
): Promise<"ok" | "shop-not-found"> {
  const shopId = await shopIdBySlug(db, input.shopSlug);
  if (!shopId) return "shop-not-found";
  unwrap(
    await db.from("submissions").insert({
      kind: "correction",
      shop_id: shopId,
      payload: payload({
        details: input.details,
        latte_price: input.lattePrice,
        hours: input.hours,
        permanently_closed: input.permanentlyClosed || undefined,
      }),
      submitter_id: submitter.id,
      submitter_name: submitter.name ?? input.submitterName ?? null,
      submitter_email: submitter.email ?? input.submitterEmail ?? null,
      proof_url: photoPath,
    }),
  );
  return "ok";
}

export async function submitClaim(
  db: Db,
  input: ClaimInput,
  submitter: Submitter,
  proofPath: string,
): Promise<"ok" | "shop-not-found"> {
  const shopId = await shopIdBySlug(db, input.shopSlug);
  if (!shopId) return "shop-not-found";
  unwrap(
    await db.from("submissions").insert({
      kind: "claim",
      shop_id: shopId,
      payload: payload({ role: input.role, phone: input.phone, message: input.message }),
      submitter_id: submitter.id,
      submitter_name: input.submitterName,
      submitter_email: input.submitterEmail,
      proof_url: proofPath,
    }),
  );
  return "ok";
}
