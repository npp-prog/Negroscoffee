import { expect, test } from "@playwright/test";

test.describe("public pages", () => {
  test("home: map shell, filters write to the URL, graceful without keys", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: /Kape Negros/ })).toBeAttached();
    await expect(page.getByText("Not connected yet").first()).toBeVisible();
    await expect(page.getByText("Map needs NEXT_PUBLIC_MAPTILER_KEY")).toBeVisible();

    await page
      .getByRole("button", { name: /Specialty/ })
      .first()
      .click();
    await expect(page).toHaveURL(/type=specialty/);
    await page
      .getByRole("button", { name: /Open now/ })
      .first()
      .click();
    await expect(page).toHaveURL(/open=1/);
    await expect(page.getByRole("button", { name: /Specialty/ }).first()).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("New filter chip writes new=1", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "New", exact: true }).first().click();
    await expect(page).toHaveURL(/new=1/);
  });

  test("filters from a shared link are applied", async ({ page }) => {
    await page.goto("/?tier=1,2&type=kapihan");
    await expect(page.getByRole("button", { name: /Local kapihan/ }).first()).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByRole("button", { name: /Budget/ }).first()).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("about page", async ({ page }) => {
    await page.goto("/about");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Every cup on Negros");
  });

  test("unknown shop shows the shop not-found page", async ({ page }) => {
    await page.goto("/shop/no-such-shop");
    await expect(page.getByRole("heading", { name: "We couldn't find that shop" })).toBeVisible();
    await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute("content", /noindex/);
  });

  test("suggest form renders with its fields", async ({ page }) => {
    await page.goto("/suggest");
    await expect(page.getByLabel("Shop name")).toBeVisible();
    await expect(page.getByRole("button", { name: "Send suggestion" })).toBeVisible();
  });

  test("offline page", async ({ page }) => {
    await page.goto("/offline");
    await expect(page.getByRole("heading", { name: "You're offline" })).toBeVisible();
  });
});

test.describe("auth and admin", () => {
  test("login page offers Google and email", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Email me a sign-in link" })).toBeVisible();
  });

  test("saved page explains missing configuration instead of crashing", async ({ page }) => {
    await page.goto("/saved");
    await expect(page.getByText("Supabase isn't configured")).toBeVisible();
  });

  test("owner area explains missing configuration instead of crashing", async ({ page }) => {
    await page.goto("/owner");
    await expect(page.getByText("Supabase isn't configured")).toBeVisible();
  });

  test("admin explains missing configuration instead of crashing", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByText("Supabase isn't configured")).toBeVisible();
  });
});

test.describe("PWA and SEO files", () => {
  test("manifest", async ({ request }) => {
    const res = await request.get("/manifest.webmanifest");
    expect(res.ok()).toBeTruthy();
    const m = await res.json();
    expect(m.short_name).toBe("Kape Negros");
    expect(m.display).toBe("standalone");
    expect(m.icons.some((i: { purpose?: string }) => i.purpose === "maskable")).toBeTruthy();
    for (const icon of m.icons) expect((await request.get(icon.src)).ok()).toBeTruthy();
  });

  test("robots.txt keeps private areas out and points to the sitemap", async ({ request }) => {
    const text = await (await request.get("/robots.txt")).text();
    expect(text).toContain("Disallow: /admin");
    expect(text).toContain("Disallow: /claim/");
    expect(text).toMatch(/Sitemap: .*\/sitemap\.xml/);
  });

  test("sitemap lists the public pages", async ({ request }) => {
    const text = await (await request.get("/sitemap.xml")).text();
    expect(text).toContain("/about</loc>");
    expect(text).toContain("/suggest</loc>");
  });

  test("service worker is served uncached", async ({ request }) => {
    const res = await request.get("/sw.js");
    expect(res.ok()).toBeTruthy();
    expect(res.headers()["cache-control"]).toContain("no-store");
    expect(await res.text()).toContain("OFFLINE_URL");
  });

  test("offline navigation falls back to the offline page", async ({ page, context }) => {
    await page.goto("/");
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      // Wait until the worker controls the page and has precached the offline page.
      if (!navigator.serviceWorker.controller) {
        await new Promise((r) =>
          navigator.serviceWorker.addEventListener("controllerchange", r, { once: true }),
        );
      }
      for (let i = 0; i < 50 && !(await caches.match("/offline")); i++)
        await new Promise((r) => setTimeout(r, 100));
    });
    await context.setOffline(true);
    await page.goto("/about").catch(() => {});
    await expect(page.getByRole("heading", { name: "You're offline" })).toBeVisible();
    await context.setOffline(false);
  });

  test("service worker registers in production", async ({ page }) => {
    await page.goto("/");
    const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
    expect(scope).toMatch(/\/$/);
  });
});
