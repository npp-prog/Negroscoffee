import type { MetadataRoute } from "next";
import { cacheLife, cacheTag } from "next/cache";

import { listPublishedListSlugs, listPublishedSlugs } from "@/lib/db";
import { hasSupabaseEnv } from "@/lib/env";
import { siteUrl } from "@/lib/site";
import { getPublicSupabase } from "@/lib/supabase/server";

async function publishedShops(): Promise<{ slug: string; updated_at: string }[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("shops");
  if (!hasSupabaseEnv()) return [];
  try {
    return await listPublishedSlugs(getPublicSupabase());
  } catch (err) {
    console.warn("[sitemap] could not list shops:", (err as Error).message);
    return [];
  }
}

async function publishedLists(): Promise<{ slug: string; updated_at: string }[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("lists");
  if (!hasSupabaseEnv()) return [];
  try {
    return await listPublishedListSlugs(getPublicSupabase());
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const [shops, lists] = await Promise.all([publishedShops(), publishedLists()]);
  return [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/lists`, changeFrequency: "weekly", priority: 0.7 },
    ...lists.map((l) => ({
      url: `${base}/lists/${l.slug}`,
      lastModified: l.updated_at,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/suggest`, changeFrequency: "monthly", priority: 0.4 },
    ...shops.map((s) => ({
      url: `${base}/shop/${s.slug}`,
      lastModified: new Date(s.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
