/** Coordinate parsing for pasted map links. Zod-free so the map page bundle stays small. */

/** "10.6765, 122.9509" or a Google/OSM/Apple maps link containing coordinates. */
export function parseLocationInput(text: string | undefined): { lat: number; lng: number } | null {
  if (!text) return null;
  let decoded = text;
  try {
    decoded = decodeURIComponent(text);
  } catch {
    // malformed %-escapes: match against the raw text
  }
  const patterns = [
    /@(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)/, // google.com/maps/@lat,lng,17z
    /[?&](?:q|ll|query|destination|mlat)=(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)/, // ?q=lat,lng
    /!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/, // google place data
    /^\s*(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)\s*$/, // plain "lat, lng"
  ];
  for (const re of patterns) {
    const m = decoded.match(re);
    if (m) {
      const lat = Number(m[1]);
      const lng = Number(m[2]);
      // Rough Negros + surroundings guard.
      if (lat > 8.5 && lat < 11.6 && lng > 121.8 && lng < 124.2) return { lat, lng };
    }
  }
  return null;
}
