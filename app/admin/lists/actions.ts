"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { expireLists, NotAdminError, requireAdmin } from "@/lib/admin-server";
import { createList, deleteList, searchShopsForList, setListItems, updateList } from "@/lib/db";

type Result = { ok: true; message?: string } | { ok: false; error: string };

const UUID = /^[0-9a-f-]{36}$/i;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function fail(err: unknown, what: string): { ok: false; error: string } {
  if (err instanceof NotAdminError) return { ok: false, error: "Admins only" };
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("shop_lists_slug_key") || msg.includes("duplicate key"))
    return { ok: false, error: "Another list already uses that web address." };
  console.error(`[admin] ${what}`, err);
  return { ok: false, error: "Couldn't save. Try again." };
}

export async function createListAction(title: string): Promise<Result> {
  const clean = title.trim().replace(/\s+/g, " ").slice(0, 100);
  if (clean.length < 2) return { ok: false, error: "Give the list a title." };
  let id: string;
  try {
    const { db } = await requireAdmin();
    id = await createList(db, clean);
  } catch (err) {
    return fail(err, "create list");
  }
  redirect(`/admin/lists/${id}`);
}

const saveSchema = z.object({
  title: z.string().trim().min(2, "Give the list a title.").max(100),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(80)
    .regex(SLUG, "Use lowercase letters, numbers and dashes."),
  description: z
    .string()
    .trim()
    .max(600)
    .transform((v) => v || null),
  status: z.enum(["draft", "published"]),
  sortOrder: z.number().int().min(-999).max(999),
  items: z
    .array(
      z.object({
        shopId: z.string().regex(UUID),
        note: z
          .string()
          .trim()
          .max(240)
          .transform((v) => v || null),
      }),
    )
    .max(50, "Keep lists to 50 shops or fewer."),
});

export type ListInput = z.input<typeof saveSchema>;

export async function saveListAction(id: string, input: ListInput): Promise<Result> {
  if (!UUID.test(id)) return { ok: false, error: "Bad request" };
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
  const v = parsed.data;
  const ids = v.items.map((i) => i.shopId);
  if (new Set(ids).size !== ids.length) return { ok: false, error: "A shop is in the list twice." };
  if (v.status === "published" && v.items.length === 0)
    return { ok: false, error: "Add at least one shop before publishing." };
  try {
    const { db } = await requireAdmin();
    // Shops first, then title/status: a list never goes live before its shops are saved.
    await setListItems(db, id, v.items);
    const { oldSlug, slug } = await updateList(db, id, v);
    expireLists([oldSlug, slug]);
    return { ok: true, message: v.status === "published" ? "Saved and live" : "Draft saved" };
  } catch (err) {
    return fail(err, "save list");
  }
}

export async function deleteListAction(id: string): Promise<Result> {
  if (!UUID.test(id)) return { ok: false, error: "Bad request" };
  try {
    const { db } = await requireAdmin();
    const slug = await deleteList(db, id);
    if (slug) expireLists([slug]);
  } catch (err) {
    return fail(err, "delete list");
  }
  redirect("/admin/lists");
}

export async function searchShopsForListAction(
  q: string,
): Promise<{ id: string; name: string; slug: string; town: string | null }[]> {
  try {
    const { db } = await requireAdmin();
    return await searchShopsForList(db, String(q ?? ""));
  } catch {
    return [];
  }
}
