"use server";

import { previewDiscountCode, type DiscountFailure } from "@/lib/discount-codes";
import { getCurrentUser } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Preview a discount code — returns the amount saved and the new total,
 * without persisting anything. Called by the booking form's Apply button.
 *
 * Auth-guarded because per-user caps are enforced against the caller's own
 * booking history.
 */
export type PreviewDiscountResult =
  | {
      ok: true;
      code: string;
      discountGEL: number;
      discountedGEL: number;
    }
  | {
      ok: false;
      reason: DiscountFailure | "AUTH_REQUIRED" | "BAD_SUBTOTAL" | "RATE_LIMITED";
      minAmountGEL?: number;
    };

export async function previewDiscountAction(input: {
  code: string;
  subtotalGEL: number;
}): Promise<PreviewDiscountResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, reason: "AUTH_REQUIRED" };

  // Throttle per user to stop brute-force enumeration of valid codes.
  const limit = await rateLimit("discount-preview", { limit: 30, windowMs: 5 * 60_000, id: user.id });
  if (!limit.success) return { ok: false, reason: "RATE_LIMITED" };

  if (!Number.isFinite(input.subtotalGEL) || input.subtotalGEL <= 0) {
    return { ok: false, reason: "BAD_SUBTOTAL" };
  }

  const result = await previewDiscountCode(input.code, user.id, Math.floor(input.subtotalGEL));
  if (!result.ok) {
    return { ok: false, reason: result.reason, minAmountGEL: result.minAmountGEL };
  }
  return {
    ok: true,
    code: result.code,
    discountGEL: result.discountGEL,
    discountedGEL: result.discountedGEL,
  };
}
