import { afterEach, describe, expect, it, vi } from "vitest";

import { siteUrl } from "@/lib/site";

afterEach(() => vi.unstubAllEnvs());

describe("siteUrl", () => {
  it("adds a missing scheme and strips paths", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "kapenegros.vercel.app/");
    expect(siteUrl()).toBe("https://kapenegros.vercel.app");
  });

  it("falls back to Vercel URLs, then localhost, when blank", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "  ");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "negroscoffee.vercel.app");
    expect(siteUrl()).toBe("https://negroscoffee.vercel.app");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
    vi.stubEnv("VERCEL_URL", "");
    expect(siteUrl()).toBe("http://localhost:3000");
  });

  it("keeps an explicit http URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3100");
    expect(siteUrl()).toBe("http://localhost:3100");
  });
});
