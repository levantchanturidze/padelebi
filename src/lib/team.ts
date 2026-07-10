/**
 * Team booking domain helpers. Runs the roster invariants — capacity checks,
 * seat accounting, duplicate-invite prevention — in one place so the actions
 * layer and the join page can share the same rules.
 *
 * Seat accounting rule of thumb:
 *   filledSeats = 1 (owner) + countOf(TeamMember.status in {INVITED, JOINED})
 *   openSeats   = teamSize - filledSeats
 * DECLINED rows are ignored so a decline frees up a slot.
 */
import { randomBytes } from "crypto";
import { prisma } from "./prisma";
import { absoluteUrl } from "./seo";

export const MIN_TEAM_SIZE = 2;
export const MAX_TEAM_SIZE = 8;

export class TeamError extends Error {}

/** Normalise share codes so URLs and DB lookups agree. */
export function generateShareCode(): string {
  // 16 hex chars ≈ 64 bits — enough entropy to make the link unguessable
  // without being too long to paste into group chats.
  return randomBytes(8).toString("hex");
}

export function buildTeamJoinUrl(shareCode: string): string {
  return absoluteUrl(`/team/join/${shareCode}`);
}

/**
 * Compute filled + open seat counts for a booking. Reads the members list
 * once and does the math in memory so callers avoid extra queries.
 */
export function seatCounts(
  teamSize: number,
  members: { status: string }[],
): { filled: number; open: number; total: number } {
  const active = members.filter((m) => m.status !== "DECLINED").length;
  const filled = 1 + active; // owner + active members
  return { filled, open: Math.max(0, teamSize - filled), total: teamSize };
}

/** Cost per player, rounded to whole GEL. Handles zero-price safely. */
export function sharePerPlayerGEL(priceGEL: number, teamSize: number): number {
  if (teamSize <= 0) return priceGEL;
  return Math.ceil(priceGEL / teamSize);
}

// ────────────────────────────────────────────────────────────────────────
// Invite by email
// ────────────────────────────────────────────────────────────────────────

/**
 * Invite a player to a team booking by email. Idempotent: if an outstanding
 * (non-DECLINED) invite for the same email already exists, throws instead
 * of silently re-sending. A DECLINED row gets refreshed back to INVITED.
 *
 * Returns the (created or refreshed) TeamMember row.
 */
export async function inviteTeamMemberByEmail(args: {
  bookingId: string;
  email: string;
}): Promise<{
  memberId: string;
  emailNormalised: string;
  bookingOwnerName: string;
  facilityName: string;
  venueName: string;
  whenStart: Date;
  whenEnd: Date;
  shareCode: string;
}> {
  const emailNormalised = args.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalised)) {
    throw new TeamError("INVALID_EMAIL");
  }

  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: args.bookingId },
      include: {
        user: true,
        facility: { include: { venue: true } },
        teamMembers: true,
      },
    });
    if (!booking) throw new TeamError("BOOKING_NOT_FOUND");
    if (!booking.isTeam || !booking.teamSize) throw new TeamError("NOT_TEAM_BOOKING");
    if (booking.status === "CANCELLED") throw new TeamError("BOOKING_CANCELLED");

    // Cannot invite the owner as a member of their own booking.
    if (booking.user.email.toLowerCase() === emailNormalised) {
      throw new TeamError("CANNOT_INVITE_OWNER");
    }

    const shareCode = booking.teamShareCode ?? generateShareCode();
    if (!booking.teamShareCode) {
      await tx.booking.update({ where: { id: booking.id }, data: { teamShareCode: shareCode } });
    }

    const seats = seatCounts(booking.teamSize, booking.teamMembers);
    if (seats.open <= 0) throw new TeamError("TEAM_FULL");

    const existingByEmail = booking.teamMembers.find(
      (m) => m.email && m.email.toLowerCase() === emailNormalised,
    );
    const existingUser = await tx.user.findUnique({
      where: { email: emailNormalised },
    });
    const existingByUser = existingUser
      ? booking.teamMembers.find((m) => m.userId === existingUser.id)
      : undefined;

    let memberId: string;
    if (existingByEmail || existingByUser) {
      const existing = existingByEmail ?? existingByUser!;
      if (existing.status === "INVITED" || existing.status === "JOINED") {
        throw new TeamError("ALREADY_INVITED");
      }
      // Refresh a previous decline back to INVITED.
      const refreshed = await tx.teamMember.update({
        where: { id: existing.id },
        data: { status: "INVITED", respondedAt: null, email: emailNormalised },
      });
      memberId = refreshed.id;
    } else {
      const created = await tx.teamMember.create({
        data: {
          bookingId: booking.id,
          email: emailNormalised,
          userId: existingUser?.id ?? null,
          status: "INVITED",
        },
      });
      memberId = created.id;
    }

    return {
      memberId,
      emailNormalised,
      bookingOwnerName: booking.user.name,
      facilityName: `${booking.facility.venue.name} · ${booking.facility.name}`,
      venueName: booking.facility.venue.name,
      whenStart: booking.startTime,
      whenEnd: booking.endTime,
      shareCode,
    };
  });
}

// ────────────────────────────────────────────────────────────────────────
// Join via share code / invite link
// ────────────────────────────────────────────────────────────────────────

/**
 * Join a team booking as the given signed-in user via its share code.
 * Idempotent — if the user is already JOINED, no-op. Fills a seat only
 * when transitioning from non-JOINED to JOINED.
 */
export async function joinTeamViaShareCode(args: {
  shareCode: string;
  userId: string;
}): Promise<{ bookingId: string }> {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { teamShareCode: args.shareCode },
      include: { teamMembers: true, user: true },
    });
    if (!booking) throw new TeamError("BOOKING_NOT_FOUND");
    if (!booking.isTeam || !booking.teamSize) throw new TeamError("NOT_TEAM_BOOKING");
    if (booking.status === "CANCELLED") throw new TeamError("BOOKING_CANCELLED");
    if (booking.endTime < new Date()) throw new TeamError("BOOKING_ENDED");

    // Owner "joins" is a no-op — they already own a seat.
    if (booking.userId === args.userId) {
      return { bookingId: booking.id };
    }

    const existing = booking.teamMembers.find((m) => m.userId === args.userId);
    if (existing?.status === "JOINED") return { bookingId: booking.id };

    // A JOIN needs an open seat. DECLINED rows don't hold seats, so a
    // previously-declined user can re-join if slots remain.
    const seats = seatCounts(booking.teamSize, booking.teamMembers);
    // Adding OR upgrading a slot counts as +1 unless we're upgrading an
    // already-active row (which shouldn't happen given the checks above).
    const wouldTakeSeat = !existing || existing.status === "DECLINED";
    if (wouldTakeSeat && seats.open <= 0) throw new TeamError("TEAM_FULL");

    if (existing) {
      await tx.teamMember.update({
        where: { id: existing.id },
        data: { status: "JOINED", respondedAt: new Date(), userId: args.userId },
      });
    } else {
      await tx.teamMember.create({
        data: {
          bookingId: booking.id,
          userId: args.userId,
          status: "JOINED",
          respondedAt: new Date(),
        },
      });
    }
    return { bookingId: booking.id };
  });
}

/**
 * Decline an invite via share code (signed-in user). Frees the slot they
 * were holding as INVITED, or is a no-op if no invite existed.
 */
export async function declineTeamViaShareCode(args: {
  shareCode: string;
  userId: string;
}): Promise<{ bookingId: string }> {
  const booking = await prisma.booking.findUnique({
    where: { teamShareCode: args.shareCode },
    include: { teamMembers: { where: { userId: args.userId } } },
  });
  if (!booking) throw new TeamError("BOOKING_NOT_FOUND");
  if (!booking.isTeam) throw new TeamError("NOT_TEAM_BOOKING");
  if (booking.userId === args.userId) throw new TeamError("OWNER_CANNOT_DECLINE");

  const existing = booking.teamMembers[0];
  if (!existing) return { bookingId: booking.id };

  await prisma.teamMember.update({
    where: { id: existing.id },
    data: { status: "DECLINED", respondedAt: new Date() },
  });
  return { bookingId: booking.id };
}

/**
 * Remove a team member (owner-only). Frees a seat and permanently deletes
 * the row so a fresh invite is possible later.
 */
export async function removeTeamMember(args: {
  memberId: string;
  actorUserId: string;
}): Promise<{ bookingId: string }> {
  const member = await prisma.teamMember.findUnique({
    where: { id: args.memberId },
    include: { booking: true },
  });
  if (!member) throw new TeamError("MEMBER_NOT_FOUND");
  if (member.booking.userId !== args.actorUserId) throw new TeamError("NOT_OWNER");

  await prisma.teamMember.delete({ where: { id: member.id } });
  return { bookingId: member.bookingId };
}
