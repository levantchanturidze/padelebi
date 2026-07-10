/**
 * Cookie consent state — persisted in a non-HttpOnly cookie so the server
 * can decide whether to render the banner and the client can read/write
 * the choice without a round-trip.
 *
 * We currently only use *essential* cookies (auth session, theme, consent
 * record, language). No analytics, no tracking. The banner therefore
 * informs users and records their acknowledgement; both buttons resolve to
 * the same technical outcome today, but the field is future-proof for
 * when analytics are added.
 */
export type ConsentPref = "accepted" | "necessary";

export const CONSENT_COOKIE = "playtora.consent";

export function isConsentPref(v: unknown): v is ConsentPref {
  return v === "accepted" || v === "necessary";
}
