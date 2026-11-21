/**
 * Absolute site URL for metadata, canonical links and JSON-LD. Tolerates a blank value or one
 * without a scheme (e.g. "kapenegros.vercel.app"), then falls back to Vercel's own URLs, then
 * localhost, so a misconfigured env var can never break the build.
 */
export function siteUrl(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
  ];
  for (const raw of candidates) {
    const value = raw?.trim();
    if (!value) continue;
    const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    try {
      return new URL(withScheme).origin;
    } catch {
      // try the next candidate
    }
  }
  return "http://localhost:3000";
}
