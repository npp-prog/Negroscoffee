/**
 * OpenStreetMap → shop draft mapping for `npm run import:osm`. Framework-free and pure
 * (no network, no DB) so it is unit-tested and reusable.
 *
 * Data © OpenStreetMap contributors, ODbL. Imported shops keep `source = 'import_osm'` so the
 * UI can show attribution.
 */
import { NEGROS_BBOX, type Bbox } from "./db/shops";
import { WEEKDAYS, type TimeRange, type Weekday, type WeeklyHours } from "./db/hours";
import { distanceM, type LatLng } from "./geo";
import type { Province, ShopType } from "./categories";

export type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

export type CityRef = { slug: string; name: string; province: Province } & LatLng;

export type OsmShopDraft = {
  osmId: string; // "node/123"
  name: string;
  slugBase: string;
  lat: number;
  lng: number;
  address: string | null;
  citySlug: string | null;
  province: Province | null;
  phone: string | null;
  website: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  hours: WeeklyHours | null;
  /** Only "chain" is inferred (brand tags / known chains); specialty vs kapihan is an admin call. */
  suggestedType: ShopType | null;
};

/** Overpass QL: cafés and coffee shops inside the Negros provinces (and Bacolod, an HUC). */
export function overpassQuery(timeoutSec = 180): string {
  return `[out:json][timeout:${timeoutSec}];
(
  area["boundary"="administrative"]["name"="Negros Occidental"];
  area["boundary"="administrative"]["name"="Negros Oriental"];
  area["boundary"="administrative"]["name"="Bacolod"];
)->.negros;
(
  nwr["amenity"="cafe"](area.negros);
  nwr["shop"="coffee"](area.negros);
  nwr["cuisine"~"(^|;)coffee_shop(;|$)"](area.negros);
);
out center tags;`;
}

// --- opening_hours --------------------------------------------------------------------------

const OSM_DAYS: Record<string, Weekday> = {
  Mo: "mon",
  Tu: "tue",
  We: "wed",
  Th: "thu",
  Fr: "fri",
  Sa: "sat",
  Su: "sun",
};
const DAY_ORDER = Object.keys(OSM_DAYS);

function expandDays(spec: string): Weekday[] | null {
  const out: Weekday[] = [];
  for (const part of spec.split(",")) {
    const range = part.trim().match(/^(Mo|Tu|We|Th|Fr|Sa|Su)(?:-(Mo|Tu|We|Th|Fr|Sa|Su))?$/);
    if (!range) return null;
    const start = DAY_ORDER.indexOf(range[1]);
    const end = range[2] ? DAY_ORDER.indexOf(range[2]) : start;
    for (let i = start; ; i = (i + 1) % 7) {
      out.push(OSM_DAYS[DAY_ORDER[i]]);
      if (i === end) break;
    }
  }
  return out;
}

const pad = (t: string) => (t.length === 4 ? `0${t}` : t);

function parseTimes(spec: string): TimeRange[] | null {
  const ranges: TimeRange[] = [];
  for (const part of spec.split(",")) {
    const m = part.trim().match(/^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})\+?$/);
    if (!m) return null;
    const open = pad(m[1]);
    let close = pad(m[2]);
    // OSM writes past-midnight closes as 26:00; store as 02:00 (our "close <= open" convention).
    const [ch, cm] = close.split(":").map(Number);
    if (ch > 24 || (ch === 24 && cm > 0))
      close = `${String(ch - 24).padStart(2, "0")}:${m[2].slice(-2)}`;
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(open) || !/^(([01]\d|2[0-3]):[0-5]\d|24:00)$/.test(close))
      return null;
    ranges.push({ open, close });
  }
  return ranges;
}

/**
 * Parse the common subset of OSM `opening_hours` ("Mo-Fr 07:00-19:00; Sa,Su 08:00-17:00",
 * "Mo-Su 07:00-12:00,13:00-21:00", "Su off", "24/7"). Anything fancier (public holidays,
 * months, sunrise, comments) returns null rather than guessing.
 */
export function parseOpeningHours(value: string | undefined): WeeklyHours | null {
  if (!value) return null;
  const text = value.trim();
  if (text === "24/7") {
    return Object.fromEntries(WEEKDAYS.map((d) => [d, [{ open: "00:00", close: "24:00" }]]));
  }
  const hours: WeeklyHours = {};
  for (const rule of text
    .split(";")
    .map((r) => r.trim())
    .filter(Boolean)) {
    const m = rule.match(/^([A-Za-z,\- ]+?)\s+(off|closed|[\d:,\-+ ]+)$/);
    // A bare time range applies to every day.
    const bare = !m && /^[\d:,\-+ ]+$/.test(rule);
    const days = bare ? [...WEEKDAYS] : m ? expandDays(m[1].replace(/\s+/g, "")) : null;
    if (!days) return null;
    const timeSpec = bare ? rule : m![2];
    const ranges = /^(off|closed)$/.test(timeSpec) ? [] : parseTimes(timeSpec.replace(/\s+/g, ""));
    if (!ranges) return null;
    for (const d of days) hours[d] = ranges; // later rules override earlier ones, as in OSM
  }
  return Object.keys(hours).length ? hours : null;
}

// --- classification -------------------------------------------------------------------------

/** Brands with branches across the Philippines. Matched case-insensitively on name/brand. */
export const KNOWN_CHAINS = [
  "starbucks",
  "coffee bean",
  "bo's coffee",
  "bos coffee",
  "tim hortons",
  "dunkin",
  "seattle's best",
  "coffee project",
  "but first coffee",
  "pickup coffee",
  "cafe amazon",
  "café amazon",
  "zus coffee",
  "highlands coffee",
  "j.co",
  "figaro",
  "tomoro",
];

export function guessType(tags: Record<string, string>): ShopType | null {
  if (tags.brand || tags["brand:wikidata"]) return "chain";
  const hay = `${tags.name ?? ""} ${tags["name:en"] ?? ""}`.toLowerCase();
  return KNOWN_CHAINS.some((c) => hay.includes(c)) ? "chain" : null;
}

/** Milk tea / bubble tea places tagged as cafés without coffee are skipped. */
export function isCoffeePlace(tags: Record<string, string>): boolean {
  if (tags.shop === "coffee") return true;
  const cuisine = (tags.cuisine ?? "")
    .toLowerCase()
    .split(";")
    .map((s) => s.trim());
  if (cuisine.some((c) => c.includes("coffee"))) return true;
  if (cuisine.some((c) => c === "bubble_tea" || c === "tea")) return false;
  return /milk ?tea|bubble ?tea|boba/i.test(tags.name ?? "") ? false : tags.amenity === "cafe";
}

// --- mapping --------------------------------------------------------------------------------

export function slugify(text: string): string {
  return (
    text
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60)
      .replace(/-+$/g, "") || "shop"
  );
}

function clean(value: string | undefined): string | null {
  const v = value?.trim();
  return v ? v.slice(0, 300) : null;
}

function socialUrl(value: string | undefined, host: string): string | null {
  const v = clean(value);
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  if (v.includes(host)) return `https://${v.replace(/^\/+/, "")}`;
  return `https://www.${host}/${v.replace(/^@/, "")}`;
}

const MAX_CITY_DISTANCE_M = 25_000;

/** City by addr:city name match first, else the nearest town center within 25 km. */
export function matchCity(
  point: LatLng,
  tags: Record<string, string>,
  cities: CityRef[],
): CityRef | null {
  const named = (tags["addr:city"] ?? tags["addr:municipality"] ?? "")
    .toLowerCase()
    .replace(/\s+city$/, "")
    .trim();
  if (named) {
    const hit = cities.find((c) => c.name.toLowerCase() === named);
    if (hit) return hit;
  }
  let best: CityRef | null = null;
  let bestD = Infinity;
  for (const c of cities) {
    const d = distanceM(point, c);
    if (d < bestD) {
      best = c;
      bestD = d;
    }
  }
  return bestD <= MAX_CITY_DISTANCE_M ? best : null;
}

function inBbox({ lat, lng }: LatLng, b: Bbox) {
  return lat >= b.minLat && lat <= b.maxLat && lng >= b.minLng && lng <= b.maxLng;
}

export type SkipReason = "no-name" | "no-location" | "not-coffee" | "outside-negros";

/** One Overpass element → draft, or the reason it was skipped. */
export function toDraft(
  el: OverpassElement,
  cities: CityRef[],
): { draft: OsmShopDraft } | { skip: SkipReason } {
  const tags = el.tags ?? {};
  const name = clean(tags.name ?? tags["name:en"]);
  if (!name) return { skip: "no-name" };
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (lat == null || lng == null) return { skip: "no-location" };
  if (!isCoffeePlace(tags)) return { skip: "not-coffee" };
  const point = { lat, lng };
  if (!inBbox(point, NEGROS_BBOX)) return { skip: "outside-negros" };

  const city = matchCity(point, tags, cities);
  const street = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ");
  return {
    draft: {
      osmId: `${el.type}/${el.id}`,
      name: name.slice(0, 120),
      slugBase: slugify(city ? `${name} ${city.name}` : name),
      lat,
      lng,
      address: clean(street || tags["addr:full"] || tags["addr:place"]),
      citySlug: city?.slug ?? null,
      province: city?.province ?? null,
      phone: clean(tags.phone ?? tags["contact:phone"]),
      website: clean(tags.website ?? tags["contact:website"]),
      facebookUrl: socialUrl(tags["contact:facebook"] ?? tags.facebook, "facebook.com"),
      instagramUrl: socialUrl(tags["contact:instagram"] ?? tags.instagram, "instagram.com"),
      hours: parseOpeningHours(tags.opening_hours),
      suggestedType: guessType(tags),
    },
  };
}

/** Pick a slug not in `taken` ("name-city", "name-city-2", …) and reserve it. */
export function uniqueSlug(base: string, taken: Set<string>): string {
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
  taken.add(slug);
  return slug;
}
