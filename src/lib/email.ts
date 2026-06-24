/**
 * Email infrastructure — Resend client + a single `sendEmail()` helper.
 *
 * Design choices:
 *   - When RESEND_API_KEY is absent (local dev without setup), sendEmail()
 *     logs the call and returns null instead of throwing. This keeps the
 *     dev loop fast and lets prod fail loudly only on real send errors.
 *   - Fire-and-forget at the call site: callers `await sendEmail(...)` if
 *     they want delivery confirmation, but never let a failed send block
 *     the user-facing action.
 */
import { Resend } from "resend";
import type { ReactElement } from "react";

const apiKey = process.env.RESEND_API_KEY;
const fromAddress = process.env.EMAIL_FROM ?? "Playtora <noreply@playtora.app>";
const replyTo = process.env.EMAIL_REPLY_TO ?? "hello@playtora.app";

const resend = apiKey ? new Resend(apiKey) : null;

export type Locale = "ka" | "en";

export function normalizeLocale(input: string | null | undefined): Locale {
  return input === "en" ? "en" : "ka";
}

type SendArgs = {
  to: string;
  subject: string;
  /** Pre-rendered React Email element. */
  react: ReactElement;
  /** Optional plain-text fallback. Resend autogenerates if omitted. */
  text?: string;
  /** Tag for Resend dashboard filtering. */
  tag?: string;
};

/**
 * Send one transactional email. Returns Resend's id on success, null when
 * the API key is missing (dev) or the send fails. Never throws.
 */
export async function sendEmail(args: SendArgs): Promise<string | null> {
  if (!resend) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[email] RESEND_API_KEY not set — would send ${args.tag ?? "email"} to ${args.to}: "${args.subject}"`,
      );
    }
    return null;
  }

  try {
    const result = await resend.emails.send({
      from: fromAddress,
      to: args.to,
      replyTo,
      subject: args.subject,
      react: args.react,
      text: args.text,
      tags: args.tag ? [{ name: "kind", value: args.tag }] : undefined,
    });
    if (result.error) {
      console.error(`[email] Resend error sending ${args.tag}:`, result.error);
      return null;
    }
    return result.data?.id ?? null;
  } catch (err) {
    console.error(`[email] sendEmail crashed for ${args.tag}:`, err);
    return null;
  }
}
