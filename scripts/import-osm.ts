/**
 * Import cafés and coffee shops on Negros from OpenStreetMap as draft shops.
 *
 *   npm run import:osm                       # fetch from Overpass, upsert drafts
 *   npm run import:osm -- --dry-run          # show what would change, write nothing
 *   npm run import:osm -- --file data.json   # use a saved Overpass response
 *   npm run import:osm -- --save data.json   # also save the raw Overpass response
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (read from .env.local).
 * Optional OVERPASS_URL (default https://overpass-api.de/api/interpreter).
 * Data © OpenStreetMap contributors (ODbL).
 */
import { readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";

import { createClient } from "@supabase/supabase-js";

import { listCities, upsertOsmDrafts, type Database } from "../lib/db";
import {
  overpassQuery,
  toDraft,
  type OsmShopDraft,
  type OverpassElement,
  type SkipReason,
} from "../lib/osm";

const { values: args } = parseArgs({
  options: {
    "dry-run": { type: "boolean", default: false },
    file: { type: "string" },
    save: { type: "string" },
  },
});

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      process.loadEnvFile(file);
    } catch {
      // optional
    }
  }
}

async function fetchOverpass(): Promise<{ elements: OverpassElement[] }> {
  const url = process.env.OVERPASS_URL ?? "https://overpass-api.de/api/interpreter";
  console.log(`Querying ${url} …`);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "user-agent": "kape-negros-osm-import/1.0",
    },
    body: new URLSearchParams({ data: overpassQuery() }),
  });
  if (!res.ok)
    throw new Error(`Overpass returned ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (e.g. in .env.local).",
    );
  }
  const db = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const data = args.file ? JSON.parse(await readFile(args.file, "utf8")) : await fetchOverpass();
  if (args.save) await writeFile(args.save, JSON.stringify(data));
  const elements: OverpassElement[] = data.elements ?? [];

  const cities = (await listCities(db)).map((c) => ({
    slug: c.slug,
    name: c.name,
    province: c.province,
    lat: c.lat,
    lng: c.lng,
  }));

  const drafts = new Map<string, OsmShopDraft>();
  const skipped: Partial<Record<SkipReason, number>> = {};
  for (const el of elements) {
    const r = toDraft(el, cities);
    if ("skip" in r) skipped[r.skip] = (skipped[r.skip] ?? 0) + 1;
    else drafts.set(r.draft.osmId, r.draft);
  }

  const result = await upsertOsmDrafts(db, [...drafts.values()], { dryRun: args["dry-run"] });

  const would = args["dry-run"] ? " (would be)" : "";
  console.log(`\nOSM elements: ${elements.length}`);
  console.log(`Skipped: ${JSON.stringify(skipped)}`);
  console.log(`New drafts${would}: ${result.inserted.length}`);
  console.log(`Refreshed untouched drafts${would}: ${result.updated.length}`);
  console.log(`Kept (already curated): ${result.kept.length}`);
  for (const k of result.kept.slice(0, 20)) console.log(`  - ${k.slug} (${k.osmId}): ${k.reason}`);
  if (args["dry-run"]) console.log("\nDry run: nothing was written.");
  else
    console.log(
      "\nReview the new drafts in the admin dashboard, set type and price, then publish.",
    );
}

main().catch((err) => {
  console.error(`import:osm failed: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
