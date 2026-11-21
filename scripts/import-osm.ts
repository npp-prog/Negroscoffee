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

const OVERPASS_ENDPOINTS = [
  process.env.OVERPASS_URL,
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
].filter((u): u is string => !!u);

/** "fetch failed" hides the real reason (DNS, refused, TLS…) in err.cause. */
function describe(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  const cause = (err as Error & { cause?: { code?: string; message?: string } }).cause;
  return cause ? `${err.message} (${cause.code ?? ""} ${cause.message ?? ""})`.trim() : err.message;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** First line of an error page, without HTML noise. */
function brief(text: string): string {
  return (
    text
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 140) || "(empty body)"
  );
}

/**
 * Query Overpass. Public servers are often "at capacity", so cycle through every endpoint in
 * rounds with exponential backoff (30 s, 1, 2, 4, 8 min + jitter) as the servers ask, until it
 * works or the overall deadline (default 25 min, OVERPASS_DEADLINE_MIN) passes.
 */
async function fetchOverpass(): Promise<{ elements: OverpassElement[]; remark?: string }> {
  const deadline = Date.now() + Number(process.env.OVERPASS_DEADLINE_MIN ?? 25) * 60_000;
  const endpoints = [...new Set(OVERPASS_ENDPOINTS)];
  let lastError = "";
  for (let round = 0; ; round++) {
    for (const url of endpoints) {
      const left = deadline - Date.now();
      if (left < 15_000)
        throw new Error(
          `Overpass servers stayed busy until the deadline. Last error: ${lastError}`,
        );
      console.log(`Round ${round + 1}: querying ${url} …`);
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "content-type": "application/x-www-form-urlencoded",
            "user-agent": "kape-negros-osm-import/1.0 (+https://github.com/npp-prog/Negroscoffee)",
          },
          body: new URLSearchParams({ data: overpassQuery() }),
          signal: AbortSignal.timeout(Math.min(150_000, left)),
        });
        if (res.ok) return res.json();
        lastError = `HTTP ${res.status}: ${brief(await res.text())}`;
      } catch (err) {
        lastError = describe(err);
      }
      console.warn(`  busy/failed: ${lastError}`);
    }
    const wait = Math.min(30_000 * 2 ** round, 8 * 60_000) + Math.random() * 10_000;
    if (Date.now() + wait > deadline) {
      throw new Error(`Overpass servers stayed busy until the deadline. Last error: ${lastError}`);
    }
    console.log(`All servers busy. Waiting ${Math.round(wait / 1000)} s before the next round …`);
    await sleep(wait);
  }
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
  if (data.remark) console.warn(`Overpass remark: ${data.remark}`);
  if (elements.length === 0) {
    throw new Error(
      "OpenStreetMap returned no places. The province boundary lookup may have failed; nothing was imported.",
    );
  }

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
