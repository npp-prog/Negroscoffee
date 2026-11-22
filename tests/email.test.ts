import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { sendEmail } from "@/lib/email/send";
import { claimDecisionEmail, newReviewEmail, newSubmissionEmail } from "@/lib/email/templates";

describe("email templates", () => {
  it("escapes user text in HTML but keeps it readable in plain text", () => {
    const m = newReviewEmail({
      shopName: "Kape <b>Lola</b>",
      rating: 4,
      body: `Great "brew" & <script>x</script>`,
      authorName: "Ana",
      ownerUrl: "https://example.com/owner/shops/1",
      settingsUrl: "https://example.com/saved",
    });
    expect(m.subject).toBe("New 4★ review for Kape <b>Lola</b>");
    expect(m.html).not.toContain("<script>");
    expect(m.html).toContain("&lt;script&gt;");
    expect(m.html).toContain("Kape &lt;b&gt;Lola&lt;/b&gt;");
    expect(m.text).toContain(`"Great "brew" & <script>x</script>"`);
    expect(m.text).toContain("https://example.com/saved");
  });

  it("labels submissions and handles anonymous senders", () => {
    const m = newSubmissionEmail({
      kind: "claim",
      title: "Brew Bros",
      from: null,
      reviewUrl: "https://example.com/admin/submissions?kind=claim",
      settingsUrl: "https://example.com/saved",
    });
    expect(m.subject).toBe("Ownership claim: Brew Bros");
    expect(m.text).toContain("Sent anonymously.");
    expect(m.html).toContain('href="https://example.com/admin/submissions?kind=claim"');
  });

  it("writes approval and rejection emails", () => {
    const base = {
      shopName: "Brew Bros",
      notes: null,
      ownerUrl: "https://e.com/owner",
      loginUrl: "https://e.com/login",
      shopUrl: "https://e.com/shop/brew-bros",
    };
    const linked = claimDecisionEmail({ ...base, approved: true, linkedAccount: true });
    expect(linked.subject).toContain("verified");
    expect(linked.html).toContain("https://e.com/owner");
    const unlinked = claimDecisionEmail({ ...base, approved: true, linkedAccount: false });
    expect(unlinked.html).toContain("https://e.com/login");
    const no = claimDecisionEmail({
      ...base,
      approved: false,
      linkedAccount: false,
      notes: "No proof",
    });
    expect(no.text).toContain("No proof");
    expect(no.subject).not.toContain("verified");
  });
});

describe("sendEmail", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });
  const msg = {
    to: ["Owner@Example.com", "owner@example.com", "bad"],
    subject: "s",
    html: "h",
    text: "t",
  };

  it("skips without an API key", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await sendEmail(msg)).toBe("skipped");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts one de-duplicated message to Resend", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_REPLY_TO", "admin@example.com");
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await sendEmail(msg)).toBe("sent");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers.authorization).toBe("Bearer re_test");
    const body = JSON.parse(init.body);
    expect(body.to).toEqual(["owner@example.com"]);
    expect(body.reply_to).toBe("admin@example.com");
  });

  it("reports failures without throwing", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("nope", { status: 403 })));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await sendEmail(msg)).toBe("failed");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await sendEmail(msg)).toBe("failed");
  });
});
