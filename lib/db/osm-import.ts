import type { OsmShopDraft } from "../osm";
import { uniqueSlug } from "../osm";
import { unwrap, type Db } from "./client";
import type { TablesInsert, TablesUpdate } from "./types";

export type OsmImportResult = {
  inserted: string[];
  updated: string[];
  /** Existing rows left alone because an admin or owner has taken them over. */
  kept: { osmId: string; slug: string; reason: string }[];
};

const CHUNK = 200;
const PAGE = 1000;

function chunks<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

const point = (d: OsmShopDraft) => `SRID=4326;POINT(${d.lng} ${d.lat})`;

/** Fields the import owns. Never touches status, tier, price, photos or menu. */
function osmFields(d: OsmShopDraft, cityIds: Map<string, string>) {
  return {
    name: d.name,
    address: d.address,
    city_id: d.citySlug ? (cityIds.get(d.citySlug) ?? null) : null,
    province: d.province,
    location: point(d),
    phone: d.phone,
    website: d.website,
    facebook_url: d.facebookUrl,
    instagram_url: d.instagramUrl,
    hours: d.hours,
  } satisfies TablesUpdate<"shops">;
}

async function allSlugs(db: Db): Promise<Set<string>> {
  const slugs = new Set<string>();
  for (let from = 0; ; from += PAGE) {
    const rows = unwrap(
      await db
        .from("shops")
        .select("slug")
        .order("slug")
        .range(from, from + PAGE - 1),
    );
    rows.forEach((r) => slugs.add(r.slug));
    if (rows.length < PAGE) return slugs;
  }
}

/**
 * Upsert OSM drafts by `osm_id` (service-role client: needs to see drafts).
 * - New OSM ids are inserted as `status = 'draft'`, `source = 'import_osm'`.
 * - Existing rows are refreshed only while they are still untouched imports
 *   (`source = 'import_osm'` and `status = 'draft'`); anything published, hidden or
 *   edited into another source is kept as is.
 */
export async function upsertOsmDrafts(
  db: Db,
  drafts: OsmShopDraft[],
  opts: { dryRun?: boolean } = {},
): Promise<OsmImportResult> {
  const result: OsmImportResult = { inserted: [], updated: [], kept: [] };
  if (drafts.length === 0) return result;

  const cityRows = unwrap(await db.from("cities").select("id, slug"));
  const cityIds = new Map(cityRows.map((c) => [c.slug, c.id]));

  const existing = new Map<string, { id: string; slug: string; status: string; source: string }>();
  for (const ids of chunks(
    drafts.map((d) => d.osmId),
    CHUNK,
  )) {
    const rows = unwrap(
      await db.from("shops").select("id, slug, osm_id, status, source").in("osm_id", ids),
    );
    rows.forEach((r) => r.osm_id && existing.set(r.osm_id, r));
  }

  const taken = await allSlugs(db);
  const toInsert: TablesInsert<"shops">[] = [];

  for (const d of drafts) {
    const row = existing.get(d.osmId);
    if (!row) {
      const slug = uniqueSlug(d.slugBase, taken);
      toInsert.push({
        ...osmFields(d, cityIds),
        slug,
        osm_id: d.osmId,
        type: d.suggestedType,
        status: "draft",
        source: "import_osm",
      });
      result.inserted.push(slug);
      continue;
    }
    if (row.source !== "import_osm" || row.status !== "draft") {
      result.kept.push({
        osmId: d.osmId,
        slug: row.slug,
        reason: `${row.status}, source ${row.source}`,
      });
      continue;
    }
    if (!opts.dryRun) {
      unwrap(await db.from("shops").update(osmFields(d, cityIds)).eq("id", row.id).select("id"));
    }
    result.updated.push(row.slug);
  }

  if (!opts.dryRun) {
    for (const batch of chunks(toInsert, CHUNK)) {
      unwrap(await db.from("shops").insert(batch).select("id"));
    }
  }
  return result;
}
