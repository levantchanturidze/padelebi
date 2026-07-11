import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyBookingReminder } from "@/lib/notify";

/** Constant-time string comparison to avoid leaking the secret via timing. */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Vercel Cron handler — runs hourly via vercel.json. Finds confirmed
 * bookings starting in 23–25 hours with no reminder sent yet and emails
 * each one once. Idempotent: each booking's `reminderSentAt` is stamped
 * after a successful send so re-runs are safe.
 *
 * Auth: Vercel Cron sets an Authorization: Bearer <CRON_SECRET> header on
 * every invocation. We reject anything that doesn't match.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Allow only in dev when CRON_SECRET is intentionally unset.
    if (process.env.NODE_ENV === "production") {
      return new NextResponse("forbidden", { status: 403 });
    }
  } else {
    const auth = request.headers.get("authorization") ?? "";
    if (!safeEqual(auth, `Bearer ${secret}`)) {
      return new NextResponse("forbidden", { status: 403 });
    }
  }

  // Cron runs once a day. Send reminders for everything in the next 12–36h
  // that hasn't been reminded yet — so every booking gets at least one
  // reminder ~12–36 hours before kickoff regardless of when it was made.
  const now = new Date();
  const windowStart = new Date(now.getTime() + 12 * 3_600_000);
  const windowEnd = new Date(now.getTime() + 36 * 3_600_000);

  const due = await prisma.booking.findMany({
    where: {
      status: "CONFIRMED",
      reminderSentAt: null,
      startTime: { gte: windowStart, lt: windowEnd },
    },
    select: { id: true },
    take: 500,
  });

  let sent = 0;
  let failed = 0;
  for (const { id } of due) {
    const ok = await notifyBookingReminder(id);
    if (ok) {
      await prisma.booking.update({
        where: { id },
        data: { reminderSentAt: new Date() },
      });
      sent++;
    } else {
      failed++;
    }
  }

  return NextResponse.json({
    ok: true,
    candidates: due.length,
    sent,
    failed,
    windowStart,
    windowEnd,
  });
}
