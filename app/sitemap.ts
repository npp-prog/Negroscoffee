import type { MetadataRoute } from "next";
import { cacheLife, cacheTag } from "next/cache";

import { listPublishedSlugs } from "@/lib/db";
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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const shops = await publishedShops();
  return [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/suggest`, changeFrequency: "monthly", priority: 0.4 },
    ...shops.map((s) => ({
      url: `${base}/shop/${s.slug}`,
      lastModified: new Date(s.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
