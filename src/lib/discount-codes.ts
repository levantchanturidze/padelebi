/**
 * Discount code redemption helpers. Two entry points:
 *
 *  - previewDiscountCode()  — read-only check for the booking form's Apply button.
 *  - applyDiscountCode(tx)  — runs inside the booking transaction, bumps
 *    usedCount, and returns the actual discount to apply. Callers persist
 *    the codeId + amount on the Booking row.
 *
 * Codes are stored uppercase and matched case-insensitively.
 */
import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";

export type DiscountFailure =
  | "NOT_FOUND"
  | "INACTIVE"
  | "EXPIRED"
  | "MAXED_OUT"
  | "USER_LIMIT_REACHED"
  | "MIN_AMOUNT";

export type PreviewResult =
  | { ok: true; codeId: string; code: string; discountedGEL: number; discountGEL: number }
  | { ok: false; reason: DiscountFailure; minAmountGEL?: number };

/** Normalise user input for lookup — uppercase, trim, strip surrounding whitespace. */
export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase();
}

/**
 * Compute the discounted price (bounded to 0). Returns the amount taken off
 * and the resulting subtotal. Values are floored to whole GEL — we never
 * charge fractions of a lari.
 */
function computeDiscount(subtotalGEL: number, type: string, value: number): {
  discountGEL: number;
  discountedGEL: number;
} {
  if (type === "PERCENT") {
    const raw = Math.floor((subtotalGEL * value) / 100);
    const discountGEL = Math.min(raw, subtotalGEL);
    return { discountGEL, discountedGEL: subtotalGEL - discountGEL };
  }
  // FIXED
  const discountGEL = Math.min(value, subtotalGEL);
  return { discountGEL, discountedGEL: subtotalGEL - discountGEL };
}

/**
 * Read-only validity check. Does NOT bump usedCount — call from the form's
 * preview action. Callers still have to re-validate inside the tx.
 */
export async function previewDiscountCode(
  rawCode: string,
  userId: string,
  subtotalGEL: number,
): Promise<PreviewResult> {
  const code = normalizeCode(rawCode);
  if (!code) return { ok: false, reason: "NOT_FOUND" };

  const row = await prisma.discountCode.findUnique({ where: { code } });
  if (!row) return { ok: false, reason: "NOT_FOUND" };
  if (!row.isActive) return { ok: false, reason: "INACTIVE" };
  if (row.expiresAt && row.expiresAt < new Date()) return { ok: false, reason: "EXPIRED" };
  if (row.maxUses !== null && row.usedCount >= row.maxUses) return { ok: false, reason: "MAXED_OUT" };
  if (row.minAmountGEL !== null && subtotalGEL < row.minAmountGEL) {
    return { ok: false, reason: "MIN_AMOUNT", minAmountGEL: row.minAmountGEL };
  }

  if (row.perUserMax !== null) {
    const used = await prisma.booking.count({
      where: {
        userId,
        discountCodeId: row.id,
        status: { not: "CANCELLED" },
      },
    });
    if (used >= row.perUserMax) return { ok: false, reason: "USER_LIMIT_REACHED" };
  }

  const { discountGEL, discountedGEL } = computeDiscount(subtotalGEL, row.type, row.value);
  return { ok: true, codeId: row.id, code: row.code, discountGEL, discountedGEL };
}

/**
 * Transaction-safe redemption. Re-checks every constraint against the
 * current DB state and increments usedCount atomically. Returns the
 * final price to store on Booking.priceGEL plus the fields to persist.
 *
 * Throws when the code is invalid — callers should catch and surface to
 * the user. We throw plain strings (compatible with existing BookingError
 * handling) rather than a typed error so any layer can pattern-match.
 */
export async function applyDiscountCode(
  tx: Prisma.TransactionClient,
  rawCode: string,
  userId: string,
  subtotalGEL: number,
): Promise<{ codeId: string; discountGEL: number; discountedGEL: number }> {
  const code = normalizeCode(rawCode);
  if (!code) throw new Error("DISCOUNT_NOT_FOUND");

  const row = await tx.discountCode.findUnique({ where: { code } });
  if (!row) throw new Error("DISCOUNT_NOT_FOUND");
  if (!row.isActive) throw new Error("DISCOUNT_INACTIVE");
  if (row.expiresAt && row.expiresAt < new Date()) throw new Error("DISCOUNT_EXPIRED");
  if (row.minAmountGEL !== null && subtotalGEL < row.minAmountGEL) throw new Error("DISCOUNT_MIN_AMOUNT");

  if (row.perUserMax !== null) {
    const used = await tx.booking.count({
      where: { userId, discountCodeId: row.id, status: { not: "CANCELLED" } },
    });
    if (used >= row.perUserMax) throw new Error("DISCOUNT_USER_LIMIT");
  }

  // Atomic stock-bump. The where-clause guard is what makes this race-safe:
  // if maxUses was hit by a concurrent booking between the read above and
  // this update, updateMany returns count=0 and we abort.
  if (row.maxUses !== null) {
    const updated = await tx.discountCode.updateMany({
      where: { id: row.id, usedCount: { lt: row.maxUses } },
      data: { usedCount: { increment: 1 } },
    });
    if (updated.count === 0) throw new Error("DISCOUNT_MAXED_OUT");
  } else {
    await tx.discountCode.update({
      where: { id: row.id },
      data: { usedCount: { increment: 1 } },
    });
  }

  const { discountGEL, discountedGEL } = computeDiscount(subtotalGEL, row.type, row.value);
  return { codeId: row.id, discountGEL, discountedGEL };
}
