import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { seatCounts, sharePerPlayerGEL } from "@/lib/team";
import { formatGEL } from "@/lib/utils";
import { respondToTeamInviteAction } from "@/app/actions/team";

/**
 * Public team-join landing page. Handles four states:
 *   1. Booking not found / not a team booking → 404
 *   2. Booking cancelled or ended → dead-end message
 *   3. Not signed in → CTA to sign in with callback back here
 *   4. Signed in → Join / Decline buttons, or "already on team" state
 */
export default async function TeamJoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ error?: string; declined?: string }>;
}) {
  const { code } = await params;
  const { error, declined } = await searchParams;
  const t = await getTranslations("teamJoin");

  const booking = await prisma.booking.findUnique({
    where: { teamShareCode: code },
    include: {
      facility: { include: { venue: true } },
      user: { select: { id: true, name: true } },
      teamMembers: true,
    },
  });

  if (!booking || !booking.isTeam || !booking.teamSize) notFound();

  const user = await getCurrentUser();
  const now = new Date();
  const isCancelled = booking.status === "CANCELLED";
  const isPast = booking.endTime < now;
  const seats = seatCounts(booking.teamSize, booking.teamMembers);
  const perPlayer = sharePerPlayerGEL(booking.priceGEL, booking.teamSize);

  const myMembership = user
    ? booking.teamMembers.find((m) => m.userId === user.id)
    : undefined;
  const isOwner = user?.id === booking.userId;
  const alreadyJoined = isOwner || myMembership?.status === "JOINED";

  return (
    <Container className="py-10 sm:py-14">
      <div className="mx-auto max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-brand-700">
            <Users className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("headingWithOwner", { owner: booking.user.name })}
          </h1>
          <p className="mt-1 text-sm text-muted">{t("subheading")}</p>
        </div>

        <Card>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <MapPin className="h-4 w-4 shrink-0 text-muted" />
              <span className="min-w-0 truncate">
                {booking.facility.venue.name} · {booking.facility.name}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <CalendarDays className="h-4 w-4 shrink-0 text-muted" />
              <span>
                {format(booking.startTime, "EEE, d MMM · HH:mm")}
                {"–"}
                {format(booking.endTime, "HH:mm")}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Users className="h-4 w-4 shrink-0 text-muted" />
              <span>
                {t("spotsCount", { filled: seats.filled, total: seats.total })}
                {" · "}
                {t("perPlayerAmount", { amount: formatGEL(perPlayer) })}
              </span>
            </div>

            {error && (
              <p className="rounded-[var(--radius-md)] bg-red-50 px-3 py-2 text-sm text-danger">
                {t("errorPrefix")} {error}
              </p>
            )}
            {declined && (
              <p className="rounded-[var(--radius-md)] bg-background px-3 py-2 text-sm text-muted">
                {t("declinedMessage")}
              </p>
            )}

            {isCancelled || isPast ? (
              <p className="rounded-[var(--radius-md)] bg-background px-3 py-2 text-sm text-muted">
                {isCancelled ? t("bookingCancelled") : t("bookingEnded")}
              </p>
            ) : !user ? (
              <div className="pt-2">
                <Link
                  href={`/login?callbackUrl=${encodeURIComponent(`/team/join/${code}`)}`}
                  className="inline-flex h-10 w-full items-center justify-center rounded-[var(--radius-md)] bg-foreground px-4 text-sm font-semibold text-white hover:bg-foreground/90"
                >
                  {t("signInToRespond")}
                </Link>
                <p className="mt-2 text-center text-xs text-muted">
                  {t("dontHaveAccount")}{" "}
                  <Link
                    href={`/register?callbackUrl=${encodeURIComponent(`/team/join/${code}`)}`}
                    className="text-cobalt-600 hover:underline"
                  >
                    {t("createOne")}
                  </Link>
                </p>
              </div>
            ) : alreadyJoined ? (
              <div className="pt-2">
                <p className="mb-3 rounded-[var(--radius-md)] bg-brand-50 px-3 py-2 text-sm text-foreground">
                  {isOwner ? t("youAreOrganiser") : t("alreadyJoined")}
                </p>
                <Link
                  href={`/account/bookings/${booking.id}`}
                  className="inline-flex h-10 w-full items-center justify-center rounded-[var(--radius-md)] border border-border bg-surface px-4 text-sm font-semibold text-foreground hover:bg-background"
                >
                  {t("viewBooking")}
                </Link>
              </div>
            ) : seats.open === 0 && myMembership?.status !== "INVITED" ? (
              <p className="rounded-[var(--radius-md)] bg-background px-3 py-2 text-sm text-muted">
                {t("teamFull")}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-2">
                <form action={respondToTeamInviteAction}>
                  <input type="hidden" name="shareCode" value={code} />
                  <input type="hidden" name="response" value="JOIN" />
                  <Button type="submit" size="lg" className="w-full">
                    {t("join")}
                  </Button>
                </form>
                <form action={respondToTeamInviteAction}>
                  <input type="hidden" name="shareCode" value={code} />
                  <input type="hidden" name="response" value="DECLINE" />
                  <Button type="submit" size="lg" variant="outline" className="w-full">
                    {t("decline")}
                  </Button>
                </form>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}
