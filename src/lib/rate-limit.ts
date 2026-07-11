import { headers } from "next/headers";

/**
 * Lightweight in-process fixed-window rate limiter.
 *
 * This guards the sensitive unauthenticated endpoints (login, register,
 * password reset) and abuse-prone authenticated ones (upload, discount
 * preview) against brute-force / flooding.
 *
 * Scope note: state lives in module memory, so on Vercel each warm serverless
 * instance limits independently. That still meaningfully raises the cost of an
 * attack while adding no external infrastructure. If a global guarantee is
 * needed later, swap `checkRateLimit` for a shared store (e.g. Upstash Redis)
 * behind the same signature — call sites won't change.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
let lastSweep = 0;

/** Drop expired buckets periodically so the map can't grow unbounded. */
function sweep(now: number): void {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = {
  success: boolean;
  remaining: number;
  retryAfterSec: number;
};

export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1, retryAfterSec: Math.ceil(windowMs / 1000) };
  }

  const retryAfterSec = Math.ceil((bucket.resetAt - now) / 1000);
  if (bucket.count >= limit) {
    return { success: false, remaining: 0, retryAfterSec };
  }

  bucket.count += 1;
  return { success: true, remaining: limit - bucket.count, retryAfterSec };
}

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return h.get("x-real-ip") ?? "unknown";
}

/**
 * Convenience wrapper for server actions. Keys by the caller's IP unless an
 * explicit `id` (e.g. a user id) is supplied.
 */
export async function rateLimit(
  action: string,
  opts: { limit: number; windowMs: number; id?: string },
): Promise<RateLimitResult> {
  const id = opts.id ?? (await clientIp());
  return checkRateLimit(`${action}:${id}`, opts.limit, opts.windowMs);
}
