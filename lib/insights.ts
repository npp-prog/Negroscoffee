/**
 * Owner insights: pure helpers over the shop_insights() payload. Framework-free.
 */
export type InsightKind = "view" | "map" | "directions" | "contact";

export type DayStats = {
  day: string;
  views: number;
  map: number;
  directions: number;
  contacts: number;
};
export type Totals = Omit<DayStats, "day">;

export type ShopInsights = {
  days: number;
  from: string;
  to: string;
  series: DayStats[];
  previous: Totals;
  favorites: number;
  visited: number;
};

export const METRICS = [
  { key: "views", label: "Page views", hint: "Shop page opened" },
  { key: "map", label: "Map taps", hint: "Shop picked on the map" },
  { key: "directions", label: "Directions", hint: "Directions tapped" },
  { key: "contacts", label: "Calls & links", hint: "Phone, website or social tapped" },
] as const satisfies readonly { key: keyof Totals; label: string; hint: string }[];

export function totals(series: DayStats[]): Totals {
  return series.reduce<Totals>(
    (t, d) => ({
      views: t.views + d.views,
      map: t.map + d.map,
      directions: t.directions + d.directions,
      contacts: t.contacts + d.contacts,
    }),
    { views: 0, map: 0, directions: 0, contacts: 0 },
  );
}

/** Percent change vs the previous period, rounded; null when there's no baseline. */
export function change(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/** Parse the RPC's JSON defensively (numbers may arrive as strings). */
export function parseInsights(raw: unknown): ShopInsights | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const day = (v: Record<string, unknown>): DayStats => ({
    day: String(v.day ?? ""),
    views: n(v.views),
    map: n(v.map),
    directions: n(v.directions),
    contacts: n(v.contacts),
  });
  const prev = (r.previous ?? {}) as Record<string, unknown>;
  return {
    days: n(r.days),
    from: String(r.from ?? ""),
    to: String(r.to ?? ""),
    series: Array.isArray(r.series) ? r.series.map((d) => day(d as Record<string, unknown>)) : [],
    previous: {
      views: n(prev.views),
      map: n(prev.map),
      directions: n(prev.directions),
      contacts: n(prev.contacts),
    },
    favorites: n(r.favorites),
    visited: n(r.visited),
  };
}
