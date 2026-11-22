/**
 * Launch readiness checks shown on the admin dashboard. Pure: callers pass in what they know.
 */
export type LaunchInput = {
  demoShops: number;
  /** Demo shops that are published (only these inflate the published count). */
  publishedDemoShops: number;
  publishedShops: number;
  hasMapKey: boolean;
  hasServiceKey: boolean;
  hasContactEmail: boolean;
  hasEmail: boolean;
  siteUrl: string;
  /** Vercel's production host for this project (VERCEL_PROJECT_PRODUCTION_URL), if known. */
  productionHost?: string | null;
};

export type LaunchItem = {
  key: string;
  label: string;
  done: boolean;
  /** Optional items don't block launch. */
  optional?: boolean;
  hint: string;
  href?: string;
};

export const MIN_PUBLISHED = 20;

export function launchChecklist(i: LaunchInput): LaunchItem[] {
  const host = (() => {
    try {
      return new URL(i.siteUrl).hostname;
    } catch {
      return "";
    }
  })();
  const customDomain = !!host && !host.endsWith(".vercel.app") && host !== "localhost";
  const prod = (i.productionHost ?? "").replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  // A *.vercel.app address that isn't this project's own is almost certainly a typo/example.
  const linksOk = !prod || customDomain || host === prod;
  return [
    {
      key: "links",
      label: "Links use the right address",
      done: linksOk,
      hint: linksOk
        ? `QR posters, invites, share links and the sitemap use ${host || "this site"}.`
        : `Links point to ${host}, but this site is ${prod}. Fix NEXT_PUBLIC_SITE_URL in Vercel (or delete it) and redeploy.`,
    },
    {
      key: "demo",
      label: "Demo shops removed",
      done: i.demoShops === 0,
      hint:
        i.demoShops === 0
          ? "No fictional demo shops left."
          : `${i.demoShops} fictional demo shops are still on the map.`,
    },
    {
      key: "shops",
      label: `At least ${MIN_PUBLISHED} real shops published`,
      done: i.publishedShops - i.publishedDemoShops >= MIN_PUBLISHED,
      hint: `${Math.max(0, i.publishedShops - i.publishedDemoShops)} published so far. Review imported drafts to add more.`,
      href: "/admin/review",
    },
    {
      key: "map",
      label: "Map key set",
      done: i.hasMapKey,
      hint: i.hasMapKey
        ? "MapTiler key is in place."
        : "Add NEXT_PUBLIC_MAPTILER_KEY in Vercel and redeploy.",
    },
    {
      key: "service",
      label: "Service key in Vercel",
      done: i.hasServiceKey,
      hint: i.hasServiceKey
        ? "Account deletion and emails can work."
        : "Add SUPABASE_SERVICE_ROLE_KEY in Vercel so visitors can delete their accounts.",
    },
    {
      key: "contact",
      label: "Contact email on the privacy page",
      done: i.hasContactEmail,
      optional: true,
      hint: i.hasContactEmail
        ? "Shown on /privacy."
        : "Add NEXT_PUBLIC_CONTACT_EMAIL in Vercel (any inbox you check) and redeploy.",
      href: "/privacy",
    },
    {
      key: "email",
      label: "Email notifications",
      done: i.hasEmail,
      optional: true,
      hint: i.hasEmail ? "Resend is connected." : "Add RESEND_API_KEY in Vercel to get emails.",
    },
    {
      key: "domain",
      label: "Custom domain",
      done: customDomain,
      optional: true,
      hint: customDomain
        ? `Live at ${host}.`
        : "Optional: buy a domain and add it in Vercel → Settings → Domains.",
    },
  ];
}
