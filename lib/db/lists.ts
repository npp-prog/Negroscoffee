/**
 * Curated coffee lists (migration 20261122000007). Public reads see published lists only (RLS);
 * admins create and edit them with their own client. Framework-free.
 */
import { slugify } from "../osm";
import { unwrap, type Db } from "./client";
import { getShopCardsByIds, type ShopCard } from "./shops";

export type ListStatus = "draft" | "published";

export type ShopListSummary = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  status: ListStatus;
  count: number;
  /** Cover photo of the first listed shop that has one. */
  coverPath: string | null;
  /** Up to three town names, in list order. */
  towns: string[];
  updatedAt: string;
};

export type ShopListItem = { shop: ShopCard; note: string | null };

export type ShopListDetail = Omit<ShopListSummary, "count" | "coverPath" | "towns"> & {
  publishedAt: string | null;
  items: ShopListItem[];
};

type ListRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  status: string;
  published_at: string | null;
  updated_at: string;
};
type ItemRow = { list_id: string; shop_id: string; position: number; note: string | null };

const LIST_COLS = "id, slug, title, description, status, published_at, updated_at";

async function itemsFor(db: Db, listIds: string[]): Promise<ItemRow[]> {
  if (!listIds.length) return [];
  return unwrap<ItemRow[]>(
    await db
      .from("shop_list_items")
      .select("list_id, shop_id, position, note")
      .in("list_id", listIds)
      .order("position"),
  );
}

function summarize(list: ListRow, items: ItemRow[], cards: Map<string, ShopCard>): ShopListSummary {
  const shops = items
    .filter((i) => i.list_id === list.id)
    .sort((a, b) => a.position - b.position)
    .map((i) => cards.get(i.shop_id))
    .filter((c): c is ShopCard => !!c);
  return {
    id: list.id,
    slug: list.slug,
    title: list.title,
    description: list.description,
    status: list.status as ListStatus,
    count: shops.length,
    coverPath: shops.find((s) => s.coverPath)?.coverPath ?? null,
    towns: [...new Set(shops.map((s) => s.cityName).filter((t): t is string => !!t))].slice(0, 3),
    updatedAt: list.updated_at,
  };
}

async function summaries(db: Db, lists: ListRow[]): Promise<ShopListSummary[]> {
  const items = await itemsFor(
    db,
    lists.map((l) => l.id),
  );
  const cards = new Map(
    (await getShopCardsByIds(db, [...new Set(items.map((i) => i.shop_id))])).map((c) => [c.id, c]),
  );
  return lists.map((l) => summarize(l, items, cards));
}

// --- public ---------------------------------------------------------------------------------

/** Published lists, in admin order then newest first. */
export async function listPublishedLists(db: Db): Promise<ShopListSummary[]> {
  const lists = unwrap<ListRow[]>(
    await db
      .from("shop_lists")
      .select(LIST_COLS)
      .eq("status", "published")
      .order("sort_order")
      .order("published_at", { ascending: false }),
  );
  return (await summaries(db, lists)).filter((l) => l.count > 0);
}

/** One list with its published shops in order; null when missing or not visible. */
export async function getListBySlug(db: Db, slug: string): Promise<ShopListDetail | null> {
  const list = unwrap<ListRow | null>(
    await db.from("shop_lists").select(LIST_COLS).eq("slug", slug).maybeSingle(),
  );
  if (!list) return null;
  const items = await itemsFor(db, [list.id]);
  const cards = new Map(
    (
      await getShopCardsByIds(
        db,
        items.map((i) => i.shop_id),
      )
    ).map((c) => [c.id, c]),
  );
  return {
    id: list.id,
    slug: list.slug,
    title: list.title,
    description: list.description,
    status: list.status as ListStatus,
    publishedAt: list.published_at,
    updatedAt: list.updated_at,
    items: items
      .map((i) => ({ shop: cards.get(i.shop_id), note: i.note }))
      .filter((i): i is ShopListItem => !!i.shop),
  };
}

export async function listPublishedListSlugs(
  db: Db,
): Promise<{ slug: string; updated_at: string }[]> {
  return unwrap(await db.from("shop_lists").select("slug, updated_at").eq("status", "published"));
}

/** Published lists that include a shop ("Featured in"). */
export async function listsForShop(
  db: Db,
  shopId: string,
): Promise<{ slug: string; title: string }[]> {
  const rows = unwrap<{ list_id: string }[]>(
    await db.from("shop_list_items").select("list_id").eq("shop_id", shopId),
  );
  if (!rows.length) return [];
  return unwrap<{ slug: string; title: string }[]>(
    await db
      .from("shop_lists")
      .select("slug, title")
      .in(
        "id",
        rows.map((r) => r.list_id),
      )
      .eq("status", "published")
      .order("sort_order"),
  );
}

// --- admin ----------------------------------------------------------------------------------

export async function adminListLists(db: Db): Promise<ShopListSummary[]> {
  const lists = unwrap<ListRow[]>(
    await db
      .from("shop_lists")
      .select(LIST_COLS)
      .order("sort_order")
      .order("updated_at", { ascending: false }),
  );
  return summaries(db, lists);
}

export type AdminListItem = {
  shopId: string;
  name: string;
  slug: string;
  status: string;
  town: string | null;
  note: string | null;
};

export type AdminList = ListRow & { sort_order: number; items: AdminListItem[] };

export async function getAdminList(db: Db, id: string): Promise<AdminList | null> {
  const list = unwrap<(ListRow & { sort_order: number }) | null>(
    await db.from("shop_lists").select(`${LIST_COLS}, sort_order`).eq("id", id).maybeSingle(),
  );
  if (!list) return null;
  const items = await itemsFor(db, [id]);
  const shops = items.length
    ? unwrap<
        {
          id: string;
          name: string;
          slug: string;
          status: string;
          cities: { name: string } | null;
        }[]
      >(
        await db
          .from("shops")
          .select("id, name, slug, status, cities(name)")
          .in(
            "id",
            items.map((i) => i.shop_id),
          ),
      )
    : [];
  const byId = new Map(shops.map((s) => [s.id, s]));
  return {
    ...list,
    items: items.flatMap((i) => {
      const s = byId.get(i.shop_id);
      return s
        ? [
            {
              shopId: s.id,
              name: s.name,
              slug: s.slug,
              status: s.status,
              town: s.cities?.name ?? null,
              note: i.note,
            },
          ]
        : [];
    }),
  };
}

/** Create a draft list with a unique slug derived from the title. Returns its id. */
export async function createList(db: Db, title: string): Promise<string> {
  const base = slugify(title).slice(0, 70) || "list";
  const taken = new Set(
    unwrap<{ slug: string }[]>(
      await db.from("shop_lists").select("slug").like("slug", `${base}%`),
    ).map((r) => r.slug),
  );
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
  const row = unwrap<{ id: string }>(
    await db.from("shop_lists").insert({ title, slug }).select("id").single(),
  );
  return row.id;
}

export async function updateList(
  db: Db,
  id: string,
  input: {
    title: string;
    slug: string;
    description: string | null;
    status: ListStatus;
    sortOrder: number;
  },
): Promise<{ oldSlug: string; slug: string }> {
  const before = unwrap<{ slug: string }>(
    await db.from("shop_lists").select("slug").eq("id", id).single(),
  );
  unwrap(
    await db
      .from("shop_lists")
      .update({
        title: input.title,
        slug: input.slug,
        description: input.description,
        status: input.status,
        sort_order: input.sortOrder,
      })
      .eq("id", id)
      .select("id"),
  );
  return { oldSlug: before.slug, slug: input.slug };
}

/** Replace a list's shops (order = array order). */
export async function setListItems(
  db: Db,
  listId: string,
  items: { shopId: string; note: string | null }[],
): Promise<void> {
  const { error } = await db.rpc("replace_list_items", {
    p_list_id: listId,
    p_items: items.map((i) => ({ shop_id: i.shopId, note: i.note ?? "" })),
  });
  if (error) throw new Error(error.message);
}

export async function deleteList(db: Db, id: string): Promise<string | null> {
  const rows = unwrap<{ slug: string }[]>(
    await db.from("shop_lists").delete().eq("id", id).select("slug"),
  );
  return rows[0]?.slug ?? null;
}

/** Published shops by name, for adding to a list. */
export async function searchShopsForList(
  db: Db,
  q: string,
  limit = 8,
): Promise<{ id: string; name: string; slug: string; town: string | null }[]> {
  const term = q
    .trim()
    .replace(/[%_,()]/g, " ")
    .slice(0, 60);
  if (term.length < 2) return [];
  const rows = unwrap<
    { id: string; name: string; slug: string; cities: { name: string } | null }[]
  >(
    await db
      .from("shops")
      .select("id, name, slug, cities(name)")
      .eq("status", "published")
      .ilike("name", `%${term}%`)
      .order("name")
      .limit(limit),
  );
  return rows.map((r) => ({ id: r.id, name: r.name, slug: r.slug, town: r.cities?.name ?? null }));
}
