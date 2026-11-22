import "server-only";

export type EmailMessage = { to: string[]; subject: string; html: string; text: string };
export type SendResult = "sent" | "skipped" | "failed";

/** True when an email provider is configured. */
export function emailEnabled() {
  return Boolean(process.env.RESEND_API_KEY);
}

/**
 * Send through Resend's HTTP API. Without RESEND_API_KEY this is a no-op ("skipped"), so the
 * app runs fine without email. Never throws: notifications must not break user actions.
 */
export async function sendEmail(msg: EmailMessage): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  const to = [
    ...new Set(
      msg.to.map((t) => t.trim().toLowerCase()).filter((t) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(t)),
    ),
  ];
  if (!key || to.length === 0) return "skipped";
  const from = process.env.EMAIL_FROM || "Kape Negros <onboarding@resend.dev>";
  const url = process.env.RESEND_API_URL || "https://api.resend.com/emails";
  // Replies go to EMAIL_REPLY_TO, else the first admin address (the default sender can't receive).
  const replyTo =
    process.env.EMAIL_REPLY_TO?.trim() ||
    process.env.NOTIFY_ADMIN_EMAILS?.split(",")[0]?.trim() ||
    undefined;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        from,
        to,
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.error(`[email] Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
      return "failed";
    }
    return "sent";
  } catch (err) {
    console.error("[email] send failed:", err instanceof Error ? err.message : err);
    return "failed";
  }
}
