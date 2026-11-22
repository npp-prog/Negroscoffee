/**
 * Explore state <-> URL query string. Framework-free so the Expo app can reuse it.
 *
 *   ?q=latte&type=specialty,kapihan&tier=1,2&open=1&city=bacolod&shop=some-slug
 *
 * Unknown or malformed values are dropped, so any shared link parses safely.
 */
import { PRICE_TIERS, SHOP_TYPES, type PriceTier, type ShopType } from "./categories";

export type ExploreFilters = {
  q: string;
  types: ShopType[];
  tiers: PriceTier[];
  openNow: boolean;
  /** Only shops published in the last NEW_DAYS days. */
  newOnly: boolean;
  city: string | null;
};

export type ExploreState = ExploreFilters & {
  /** Slug of the selected shop. */
  shop: string | null;
};

export const EMPTY_FILTERS: ExploreFilters = {
  q: "",
  types: [],
  tiers: [],
  openNow: false,
  newOnly: false,
  city: null,
};

export const EMPTY_STATE: ExploreState = { ...EMPTY_FILTERS, shop: null };

/** Query keys owned by the explore state. Other keys in the URL are left alone. */
export const FILTER_KEYS = ["q", "type", "tier", "open", "new", "city", "shop"] as const;

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_Q = 80;

type ParamsLike = { get(name: string): string | null };

function list<T extends string | number>(
  raw: string | null,
  allowed: readonly T[],
  cast: (s: string) => T,
): T[] {
  if (!raw) return [];
  const wanted = new Set(raw.split(",").map((s) => cast(s.trim())));
  // Keep canonical order and drop duplicates/unknowns.
  return allowed.filter((v) => wanted.has(v));
}

export function parseExploreState(params: ParamsLike): ExploreState {
  const q = (params.get("q") ?? "").slice(0, MAX_Q);
  const city = params.get("city");
  const shop = params.get("shop");
  return {
    q,
    types: list(params.get("type"), SHOP_TYPES, (s) => s as ShopType),
    tiers: list(params.get("tier"), PRICE_TIERS, (s) => Number(s) as PriceTier),
    openNow: params.get("open") === "1",
    newOnly: params.get("new") === "1",
    city: city && SLUG.test(city) ? city : null,
    shop: shop && SLUG.test(shop) ? shop : null,
  };
}

/**
 * Write state into a copy of `base` (keeping unrelated params) and return the query string
 * without a leading "?". Empty values are removed so the default view has a clean URL.
 */
export function serializeExploreState(
  state: Partial<ExploreState>,
  base: string | URLSearchParams = "",
): string {
  const params = new URLSearchParams(base);
  const s = { ...EMPTY_STATE, ...state };
  const set = (key: string, value: string | null) => {
    if (value) params.set(key, value);
    else params.delete(key);
  };
  set("q", s.q.trim() ? s.q.slice(0, MAX_Q) : null);
  set("type", s.types.length ? SHOP_TYPES.filter((t) => s.types.includes(t)).join(",") : null);
  set("tier", s.tiers.length ? PRICE_TIERS.filter((t) => s.tiers.includes(t)).join(",") : null);
  set("open", s.openNow ? "1" : null);
  set("new", s.newOnly ? "1" : null);
  set("city", s.city);
  set("shop", s.shop);
  return params.toString();
}

export function hasActiveFilters(f: ExploreFilters): boolean {
  return (
    f.q.trim() !== "" ||
    f.types.length > 0 ||
    f.tiers.length > 0 ||
    f.openNow ||
    f.newOnly ||
    !!f.city
  );
}

export function toggleValue<T>(list: readonly T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}
