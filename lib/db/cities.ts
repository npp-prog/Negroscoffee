import type { Province } from "../categories";
import { unwrap, type Db } from "./client";

export type City = {
  id: string;
  slug: string;
  name: string;
  province: Province;
  isCity: boolean;
  lat: number;
  lng: number;
};

/** Cities with their centers (for "zoom to town"). Center is read as GeoJSON via PostgREST. */
export async function listCities(db: Db): Promise<City[]> {
  const rows = unwrap(
    await db.from("cities").select("id, slug, name, province, is_city, center").order("name"),
  );
  return rows.flatMap((r) => {
    const point = parsePoint(r.center);
    return point
      ? [
          {
            id: r.id,
            slug: r.slug,
            name: r.name,
            province: r.province,
            isCity: r.is_city,
            ...point,
          },
        ]
      : [];
  });
}

/** PostgREST returns geography as GeoJSON ({type:"Point",coordinates:[lng,lat]}) or EWKB hex. */
export function parsePoint(value: unknown): { lat: number; lng: number } | null {
  if (value && typeof value === "object" && "coordinates" in value) {
    const [lng, lat] = (value as { coordinates: number[] }).coordinates;
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  if (typeof value === "string" && /^[0-9a-fA-F]+$/.test(value)) return parseEwkbPoint(value);
  return null;
}

/** Decode a little/big-endian (E)WKB point hex string. */
function parseEwkbPoint(hex: string): { lat: number; lng: number } | null {
  const bytes = new Uint8Array(hex.match(/../g)!.map((b) => parseInt(b, 16)));
  const view = new DataView(bytes.buffer);
  const le = bytes[0] === 1;
  const type = view.getUint32(1, le);
  if ((type & 0xff) !== 1) return null; // not a Point
  const offset = type & 0x20000000 ? 9 : 5; // skip SRID if present
  if (bytes.length < offset + 16) return null;
  return { lng: view.getFloat64(offset, le), lat: view.getFloat64(offset + 8, le) };
}
