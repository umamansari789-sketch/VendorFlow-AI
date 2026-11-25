import { Resend } from "resend";

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

/**
 * Sends a follow-up email through Resend.
 * Returns { delivered: false } when Resend is not configured, so the follow-up is still logged.
 */
export async function sendEmail(opts: { to: string; subject: string; body: string }) {
  if (!process.env.RESEND_API_KEY) return { delivered: false as const, error: "RESEND_API_KEY not set" };
  const from = process.env.EMAIL_FROM || "VendorFlow AI <onboarding@resend.dev>";
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from,
      to: opts.to,
      subject: opts.subject,
      text: opts.body,
    });
    if (error) return { delivered: false as const, error: error.message };
    return { delivered: true as const };
  } catch (err) {
    return { delivered: false as const, error: err instanceof Error ? err.message : "Unknown email error" };
  }
}
