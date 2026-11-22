import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/owner", "/saved", "/login", "/auth/", "/claim/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
