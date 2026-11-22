import { describe, expect, it } from "vitest";

import { launchChecklist, MIN_PUBLISHED } from "@/lib/launch";

const base = {
  demoShops: 10,
  publishedDemoShops: 10,
  publishedShops: 15,
  hasMapKey: true,
  hasServiceKey: false,
  hasContactEmail: false,
  hasEmail: false,
  siteUrl: "https://kapenegros.vercel.app",
};
const byKey = (items: ReturnType<typeof launchChecklist>) =>
  Object.fromEntries(items.map((i) => [i.key, i]));

describe("launchChecklist", () => {
  it("flags demo shops and doesn't count them as real", () => {
    const c = byKey(launchChecklist(base));
    expect(c.demo.done).toBe(false);
    expect(c.demo.hint).toContain("10");
    expect(c.shops.hint).toContain("5 published");
  });

  it("passes when everything is set", () => {
    const items = launchChecklist({
      ...base,
      demoShops: 0,
      publishedDemoShops: 0,
      publishedShops: MIN_PUBLISHED,
      hasServiceKey: true,
      hasContactEmail: true,
      hasEmail: true,
      siteUrl: "https://kapenegros.com",
    });
    expect(items.every((i) => i.done)).toBe(true);
  });

  it("only subtracts published demo shops", () => {
    const c = byKey(launchChecklist({ ...base, publishedDemoShops: 0, publishedShops: 20 }));
    expect(c.shops.done).toBe(true);
  });

  it("flags a site URL that isn't this project's Vercel address", () => {
    const wrong = byKey(launchChecklist({ ...base, productionHost: "negroscoffee.vercel.app" }));
    expect(wrong.links.done).toBe(false);
    expect(wrong.links.hint).toContain("negroscoffee.vercel.app");
    const right = launchChecklist({
      ...base,
      siteUrl: "https://negroscoffee.vercel.app",
      productionHost: "negroscoffee.vercel.app",
    });
    expect(byKey(right).links.done).toBe(true);
    expect(
      byKey(
        launchChecklist({
          ...base,
          siteUrl: "https://kapenegros.com",
          productionHost: "negroscoffee.vercel.app",
        }),
      ).links.done,
    ).toBe(true);
  });

  it("treats vercel.app and localhost as no custom domain", () => {
    expect(byKey(launchChecklist(base)).domain.done).toBe(false);
    expect(byKey(launchChecklist({ ...base, siteUrl: "http://localhost:3000" })).domain.done).toBe(
      false,
    );
  });
});
