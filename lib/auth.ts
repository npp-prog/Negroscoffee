/** Only allow same-site relative paths as the post-login destination (no open redirects). */
export function safeNext(next: string | null | undefined, fallback = "/admin"): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.includes("\\")
    ? next
    : fallback;
}
