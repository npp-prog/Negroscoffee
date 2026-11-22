/**
 * Notification email templates. Pure functions (no Next.js, no network) so they're unit-tested
 * and reusable. Each returns a subject plus HTML and plain-text bodies.
 */

export type EmailContent = { subject: string; html: string; text: string };

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const stars = (n: number) => "★".repeat(n) + "☆".repeat(Math.max(0, 5 - n));

/** Shared layout: oat background, white card, espresso text, crema button. */
function layout(opts: {
  heading: string;
  body: string;
  cta?: { label: string; url: string };
  footer: string;
}) {
  const button = opts.cta
    ? `<p style="margin:24px 0 0"><a href="${esc(opts.cta.url)}" style="display:inline-block;background:#C8893B;color:#2B1D14;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:999px">${esc(opts.cta.label)}</a></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#F6F1EA;font-family:Inter,Segoe UI,Arial,sans-serif;color:#2B1D14">
<div style="max-width:560px;margin:0 auto;padding:24px">
<p style="margin:0 0 16px;font-weight:700;font-size:18px">Kape <span style="color:#C8893B">Negros</span></p>
<div style="background:#FFFFFF;border:1px solid #E7DED3;border-radius:16px;padding:24px">
<h1 style="margin:0 0 12px;font-size:20px">${esc(opts.heading)}</h1>
${opts.body}${button}
</div>
<p style="margin:16px 4px 0;font-size:12px;color:#7A6758">${esc(opts.footer)}</p>
</div></body></html>`;
}

const para = (s: string) => `<p style="margin:0 0 12px;line-height:1.5">${esc(s)}</p>`;
const quote = (s: string) =>
  `<blockquote style="margin:0 0 12px;padding:8px 12px;border-left:3px solid #C8893B;background:#F6F1EA;border-radius:4px;white-space:pre-line">${esc(s)}</blockquote>`;

export function newReviewEmail(p: {
  shopName: string;
  rating: number;
  body: string | null;
  authorName: string;
  ownerUrl: string;
  settingsUrl: string;
}): EmailContent {
  const subject = `New ${p.rating}★ review for ${p.shopName}`;
  const text = [
    `${p.authorName} rated ${p.shopName} ${p.rating}/5 (${stars(p.rating)}).`,
    p.body ? `\n"${p.body}"\n` : "",
    `Reply from My shop: ${p.ownerUrl}`,
    ``,
    `You get this because you manage ${p.shopName} on Kape Negros. Turn emails off: ${p.settingsUrl}`,
  ].join("\n");
  const html = layout({
    heading: `New review for ${p.shopName}`,
    body:
      para(`${p.authorName} rated your shop ${p.rating} out of 5.`) +
      `<p style="margin:0 0 12px;font-size:20px;color:#C8893B;letter-spacing:2px">${stars(p.rating)}</p>` +
      (p.body ? quote(p.body) : "") +
      para("A short, friendly reply shows customers you care."),
    cta: { label: "Reply on My shop", url: p.ownerUrl },
    footer: `You get this because you manage ${p.shopName} on Kape Negros. Turn emails off on your Saved page: ${p.settingsUrl}`,
  });
  return { subject, html, text };
}

export type SubmissionKindLabel = "new_shop" | "claim" | "correction";

const KIND_LABEL: Record<SubmissionKindLabel, string> = {
  new_shop: "New shop suggestion",
  claim: "Ownership claim",
  correction: "Edit suggestion",
};

export function newSubmissionEmail(p: {
  kind: SubmissionKindLabel;
  title: string;
  from: string | null;
  reviewUrl: string;
  settingsUrl: string;
}): EmailContent {
  const label = KIND_LABEL[p.kind];
  const subject = `${label}: ${p.title}`;
  const who = p.from ? `From ${p.from}.` : "Sent anonymously.";
  const text = [
    `${label} for ${p.title}. ${who}`,
    ``,
    `Review it: ${p.reviewUrl}`,
    ``,
    `Turn emails off: ${p.settingsUrl}`,
  ].join("\n");
  const html = layout({
    heading: `${label}: ${p.title}`,
    body: para(who) + para("It's waiting in your review queue."),
    cta: { label: "Open the queue", url: p.reviewUrl },
    footer: `You get this because you're a Kape Negros admin. Turn emails off on your Saved page: ${p.settingsUrl}`,
  });
  return { subject, html, text };
}

export function claimDecisionEmail(p: {
  shopName: string;
  approved: boolean;
  linkedAccount: boolean;
  notes: string | null;
  ownerUrl: string;
  loginUrl: string;
  shopUrl: string;
}): EmailContent {
  if (p.approved) {
    const next = p.linkedAccount
      ? "You can now update prices, hours, menu and photos from My shop."
      : "Sign in with this email address, then reply to this email so we can link the shop to your account.";
    const subject = `You're verified as the owner of ${p.shopName}`;
    const text = [
      `Good news! Your claim for ${p.shopName} was approved and the shop now shows a Verified badge.`,
      next,
      p.notes ? `\nNote from our team: ${p.notes}` : "",
      ``,
      p.linkedAccount ? `My shop: ${p.ownerUrl}` : `Sign in: ${p.loginUrl}`,
    ].join("\n");
    const html = layout({
      heading: `You're verified, ${p.shopName}!`,
      body:
        para(
          `Your claim was approved and ${p.shopName} now shows a Verified badge on Kape Negros.`,
        ) +
        para(next) +
        (p.notes ? quote(`Note from our team: ${p.notes}`) : ""),
      cta: p.linkedAccount
        ? { label: "Open My shop", url: p.ownerUrl }
        : { label: "Sign in", url: p.loginUrl },
      footer: "You get this because you sent an ownership claim on Kape Negros.",
    });
    return { subject, html, text };
  }
  const subject = `About your claim for ${p.shopName}`;
  const text = [
    `Thanks for your claim for ${p.shopName}. We couldn't verify it this time.`,
    p.notes ? `\nNote from our team: ${p.notes}` : "",
    ``,
    `You're welcome to send a new claim with clearer proof (e.g. a business permit): ${p.shopUrl}`,
  ].join("\n");
  const html = layout({
    heading: `About your claim for ${p.shopName}`,
    body:
      para("Thanks for reaching out. We couldn't verify this claim this time.") +
      (p.notes ? quote(`Note from our team: ${p.notes}`) : "") +
      para(
        "You're welcome to send a new claim with clearer proof, such as a business permit or DTI registration.",
      ),
    cta: { label: "View the shop", url: p.shopUrl },
    footer: "You get this because you sent an ownership claim on Kape Negros.",
  });
  return { subject, html, text };
}
