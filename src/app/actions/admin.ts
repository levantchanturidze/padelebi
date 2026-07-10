"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { VENUE_STATUSES, ROLES } from "@/lib/enums";

export async function setVenueStatusAction(formData: FormData) {
  await requireRole(["PLATFORM_ADMIN"], "/admin");
  const venueId = String(formData.get("venueId"));
  const status = z.enum(VENUE_STATUSES).parse(formData.get("status"));

  await prisma.venue.update({ where: { id: venueId }, data: { status } });
  revalidatePath("/admin/venues");
  revalidatePath("/admin");
}

export async function setUserRoleAction(formData: FormData) {
  const admin = await requireRole(["PLATFORM_ADMIN"], "/admin");
  const userId = String(formData.get("userId"));
  const role = z.enum(ROLES).parse(formData.get("role"));

  // Prevent admins from demoting themselves (avoid lockout).
  if (userId === admin.id) return;

  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/admin/users");
}

export async function setUserActiveAction(formData: FormData) {
  const admin = await requireRole(["PLATFORM_ADMIN"], "/admin");
  const userId = String(formData.get("userId"));
  const isActive = formData.get("isActive") === "true";

  if (userId === admin.id) return;

  await prisma.user.update({ where: { id: userId }, data: { isActive } });
  revalidatePath("/admin/users");
}

/* ----------------------------- Sports catalog ----------------------------- */

const SPORT_CATEGORIES = ["RACQUET", "TEAM", "FITNESS", "WATER", "INDIVIDUAL"] as const;

const sportSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[a-z][a-z0-9-]*$/, "Use lowercase letters, numbers and dashes only"),
  name: z.string().min(2).max(60),
  category: z.enum(SPORT_CATEGORIES),
  icon: z.string().min(2).max(40).default("Activity"),
  sortOrder: z.number().int().min(0).max(10000).default(500),
});

export async function createSportAction(formData: FormData) {
  await requireRole(["PLATFORM_ADMIN"], "/admin/sports");

  const parsed = sportSchema.parse({
    slug: String(formData.get("slug") ?? "").trim().toLowerCase(),
    name: String(formData.get("name") ?? "").trim(),
    category: String(formData.get("category") ?? "INDIVIDUAL"),
    icon: String(formData.get("icon") ?? "Activity").trim(),
    sortOrder: Number(formData.get("sortOrder") ?? 500),
  });

  const existing = await prisma.sport.findUnique({ where: { slug: parsed.slug } });
  if (existing) {
    // Slug collision — treat as edit: re-activate + update name/category/icon/order.
    await prisma.sport.update({
      where: { id: existing.id },
      data: { ...parsed, isActive: true },
    });
  } else {
    await prisma.sport.create({ data: { ...parsed, isActive: true } });
  }

  revalidatePath("/admin/sports");
  revalidatePath("/sports");
  revalidatePath("/venues");
}

export async function updateSportAction(formData: FormData) {
  await requireRole(["PLATFORM_ADMIN"], "/admin/sports");
  const id = String(formData.get("sportId") ?? "");

  const parsed = sportSchema.parse({
    slug: String(formData.get("slug") ?? "").trim().toLowerCase(),
    name: String(formData.get("name") ?? "").trim(),
    category: String(formData.get("category") ?? "INDIVIDUAL"),
    icon: String(formData.get("icon") ?? "Activity").trim(),
    sortOrder: Number(formData.get("sortOrder") ?? 500),
  });

  await prisma.sport.update({ where: { id }, data: parsed });
  revalidatePath("/admin/sports");
  revalidatePath("/sports");
  revalidatePath("/venues");
}

export async function toggleSportActiveAction(formData: FormData) {
  await requireRole(["PLATFORM_ADMIN"], "/admin/sports");
  const id = String(formData.get("sportId") ?? "");
  const isActive = formData.get("isActive") === "true";

  await prisma.sport.update({ where: { id }, data: { isActive } });
  revalidatePath("/admin/sports");
  revalidatePath("/sports");
  revalidatePath("/venues");
}

/* ----------------------------- Discount codes ----------------------------- */

/**
 * Codes are stored uppercase. `value` is a whole percent (1-100) when
 * type=PERCENT, otherwise a GEL amount (>= 1). Optional nullable fields are
 * blanks in the form — we normalise them here rather than in the DB.
 */
const discountCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3)
    .max(32)
    .regex(/^[A-Z0-9_-]+$/i, "Only letters, digits, - and _"),
  type: z.enum(["PERCENT", "FIXED"]),
  value: z.number().int().min(1),
  maxUses: z.number().int().min(1).nullable(),
  perUserMax: z.number().int().min(1).nullable(),
  minAmountGEL: z.number().int().min(1).nullable(),
  expiresAt: z.date().nullable(),
});

function parseOptionalInt(raw: FormDataEntryValue | null): number | null {
  if (raw === null || String(raw).trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.floor(n) : null;
}

function parseOptionalDate(raw: FormDataEntryValue | null): Date | null {
  if (raw === null || String(raw).trim() === "") return null;
  const d = new Date(String(raw));
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function createDiscountCodeAction(formData: FormData) {
  await requireRole(["PLATFORM_ADMIN"], "/admin/discount-codes");

  const parsed = discountCodeSchema.parse({
    code: String(formData.get("code") ?? "").toUpperCase(),
    type: String(formData.get("type") ?? "PERCENT"),
    value: Math.floor(Number(formData.get("value") ?? 0)),
    maxUses: parseOptionalInt(formData.get("maxUses")),
    perUserMax: parseOptionalInt(formData.get("perUserMax")),
    minAmountGEL: parseOptionalInt(formData.get("minAmountGEL")),
    expiresAt: parseOptionalDate(formData.get("expiresAt")),
  });

  // PERCENT is bounded to 100. FIXED has no upper bound.
  if (parsed.type === "PERCENT" && parsed.value > 100) {
    throw new Error("PERCENT codes are capped at 100%.");
  }

  await prisma.discountCode.create({ data: parsed });
  revalidatePath("/admin/discount-codes");
}

export async function toggleDiscountCodeActiveAction(formData: FormData) {
  await requireRole(["PLATFORM_ADMIN"], "/admin/discount-codes");
  const id = String(formData.get("codeId") ?? "");
  const isActive = formData.get("isActive") === "true";
  await prisma.discountCode.update({ where: { id }, data: { isActive } });
  revalidatePath("/admin/discount-codes");
}

export async function deleteDiscountCodeAction(formData: FormData) {
  await requireRole(["PLATFORM_ADMIN"], "/admin/discount-codes");
  const id = String(formData.get("codeId") ?? "");
  // Booking.discountCodeId is ON DELETE SET NULL, so historical bookings
  // just lose the FK — the snapshotted discountAmountGEL stays.
  await prisma.discountCode.delete({ where: { id } });
  revalidatePath("/admin/discount-codes");
}
