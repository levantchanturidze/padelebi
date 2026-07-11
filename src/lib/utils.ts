import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format an integer GEL amount as a localized currency string. */
export function formatGEL(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "GEL",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Minutes from midnight -> "HH:mm". */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "HH:mm" -> minutes from midnight. */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Safe JSON.parse with a fallback. */
export function parseJSON<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

/**
 * Serialize an object for embedding in an inline <script type="application/ld+json">.
 * `JSON.stringify` does not escape `<`, `>` or `&`, so DB-sourced values (venue
 * name, description, address) could otherwise break out of the script tag and
 * execute — a stored XSS. Escaping these (plus the JS line separators U+2028 /
 * U+2029) to their unicode forms keeps the JSON valid while making tag-breakout
 * impossible.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/**
 * Keep only strings that are absolute HTTPS URLs whose host is an allowed
 * image origin (Vercel Blob). Used to sanitize manager-supplied photo arrays
 * so arbitrary/attacker URLs can't be stored and later fetched server-side
 * (SSRF via OG image generation) or rendered.
 */
export function sanitizePhotoUrls(urls: unknown): string[] {
  if (!Array.isArray(urls)) return [];
  const out: string[] = [];
  for (const raw of urls) {
    if (typeof raw !== "string") continue;
    try {
      const u = new URL(raw);
      if (u.protocol !== "https:") continue;
      if (!/(^|\.)vercel-storage\.com$/.test(u.hostname)) continue;
      out.push(u.toString());
    } catch {
      // not a valid absolute URL — drop it
    }
  }
  return out;
}
