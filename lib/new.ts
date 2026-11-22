/** "New" = published within the last NEW_DAYS days. Framework-free. */
export const NEW_DAYS = 14;

export function isNewShop(
  publishedAt: string | null | undefined,
  now: Date = new Date(),
  days = NEW_DAYS,
): boolean {
  if (!publishedAt) return false;
  const t = Date.parse(publishedAt);
  if (!Number.isFinite(t)) return false;
  const age = now.getTime() - t;
  return age >= -60_000 && age <= days * 86_400_000; // small skew tolerance for future timestamps
}
