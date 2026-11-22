/** Only allow same-site relative paths as the post-login destination (no open redirects). */
export function safeNext(next: string | null | undefined, fallback = "/admin"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  // Browsers strip tabs/newlines and treat "\" as "/", so "/\t/evil.com" would leave the site.
  if (/[\x00-\x1f\x7f\\]/.test(next)) return fallback;
  // Belt and braces: it must still resolve to this origin.
  try {
    const url = new URL(next, "https://kape.invalid");
    if (url.origin !== "https://kape.invalid") return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
