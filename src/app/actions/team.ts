"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import {
  inviteTeamMemberByEmail,
  joinTeamViaShareCode,
  declineTeamViaShareCode,
  removeTeamMember,
  TeamError,
} from "@/lib/team";
import { notifyTeamInvite } from "@/lib/notify";

export type TeamActionState = { error?: string; success?: string } | undefined;

function toMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  switch (msg) {
    case "INVALID_EMAIL":       return "Please enter a valid email.";
    case "BOOKING_NOT_FOUND":   return "Booking not found.";
    case "NOT_TEAM_BOOKING":    return "This isn't a team booking.";
    case "BOOKING_CANCELLED":   return "This booking has been cancelled.";
    case "BOOKING_ENDED":       return "This booking has already ended.";
    case "TEAM_FULL":           return "The team is already full.";
    case "ALREADY_INVITED":     return "That player is already on the team.";
    case "CANNOT_INVITE_OWNER": return "You can't invite yourself.";
    case "OWNER_CANNOT_DECLINE": return "As the organiser you can only cancel the whole booking.";
    case "MEMBER_NOT_FOUND":    return "That team member no longer exists.";
    case "NOT_OWNER":           return "Only the organiser can do that.";
    default: return "Could not update the team. Please try again.";
  }
}

const emailSchema = z.string().trim().toLowerCase().email();

/**
 * Owner invites a player by email. Fires the invite email fire-and-forget so
 * a Resend outage doesn't block the invite from being created in the DB.
 */
export async function inviteTeamMemberAction(
  _prev: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in first." };

  const bookingId = String(formData.get("bookingId") ?? "");
  const emailRaw = String(formData.get("email") ?? "");
  const parsedEmail = emailSchema.safeParse(emailRaw);
  if (!parsedEmail.success) return { error: "Please enter a valid email." };

  // Only the booking owner may invite.
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { userId: true },
  });
  if (!booking || booking.userId !== user.id) return { error: "Only the organiser can invite." };

  let ctx;
  try {
    ctx = await inviteTeamMemberByEmail({ bookingId, email: parsedEmail.data });
  } catch (err) {
    if (err instanceof TeamError) return { error: toMessage(err) };
    return { error: toMessage(err) };
  }

  void notifyTeamInvite({
    email: ctx.emailNormalised,
    ownerName: ctx.bookingOwnerName,
    facilityName: ctx.facilityName,
    whenStart: ctx.whenStart,
    whenEnd: ctx.whenEnd,
    shareCode: ctx.shareCode,
  });

  revalidatePath(`/account/bookings/${bookingId}`);
  return { success: "Invite sent." };
}

export async function respondToTeamInviteAction(formData: FormData) {
  const user = await getCurrentUser();
  const shareCode = String(formData.get("shareCode") ?? "");
  const response = String(formData.get("response") ?? "");
  if (!user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/team/join/${shareCode}`)}`);
  }

  try {
    if (response === "JOIN") {
      const { bookingId } = await joinTeamViaShareCode({ shareCode, userId: user.id });
      revalidatePath(`/account/bookings/${bookingId}`);
      redirect(`/account/bookings/${bookingId}`);
    }
    if (response === "DECLINE") {
      await declineTeamViaShareCode({ shareCode, userId: user.id });
      redirect(`/team/join/${shareCode}?declined=1`);
    }
    redirect(`/team/join/${shareCode}`);
  } catch (err) {
    if (err instanceof TeamError) {
      redirect(`/team/join/${shareCode}?error=${encodeURIComponent(err.message)}`);
    }
    throw err;
  }
}

export async function removeTeamMemberAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const memberId = String(formData.get("memberId") ?? "");
  try {
    const { bookingId } = await removeTeamMember({ memberId, actorUserId: user.id });
    revalidatePath(`/account/bookings/${bookingId}`);
  } catch {
    // Silent — the roster reload will show the actual current state.
  }
}
