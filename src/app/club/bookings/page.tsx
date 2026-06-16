import { format } from "date-fns";
import { getTranslations } from "next-intl/server";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { cancelBookingAction } from "@/app/actions/booking";
import { formatGEL } from "@/lib/utils";

const tone = { CONFIRMED: "success", PENDING: "warning", CANCELLED: "danger" } as const;

export default async function ClubBookingsPage() {
  const user = await requireRole(["CLUB_ADMIN", "PLATFORM_ADMIN"], "/club/bookings");
  const t = await getTranslations("club");

  const CLUB_NAV = [
    { href: "/club", label: t("overview") },
    { href: "/club/bookings", label: t("bookings") },
  ];

  const clubs = await prisma.club.findMany({
    where: user.role === "PLATFORM_ADMIN" ? {} : { ownerId: user.id },
    select: { id: true },
  });
  const clubIds = clubs.map((c) => c.id);

  const bookings = await prisma.booking.findMany({
    where: { court: { clubId: { in: clubIds } } },
    include: { court: { include: { club: true } }, user: true },
    orderBy: { startTime: "desc" },
    take: 200,
  });

  const now = new Date();

  return (
    <DashboardShell title={t("bookings")} subtitle={t("allBookings")} nav={CLUB_NAV} current="/club/bookings">
      <Card>
        <CardContent>
          {bookings.length === 0 ? (
            <p className="text-sm text-muted">{t("noBookings")}</p>
          ) : (
            <>
              {/* Mobile card list */}
              <div className="space-y-3 sm:hidden">
                {bookings.map((b) => (
                  <div key={b.id} className="rounded-[var(--radius-md)] border border-border p-4 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{format(b.startTime, "d MMM HH:mm")}–{format(b.endTime, "HH:mm")}</p>
                        <p className="mt-0.5 text-muted">{b.court.club.name} / {b.court.name}</p>
                      </div>
                      <Badge tone={tone[b.status as keyof typeof tone] ?? "neutral"}>
                        {b.status.toLowerCase()}
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div>
                        <p>{b.user.name}</p>
                        {b.user.phone && <p className="text-muted">{b.user.phone}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{formatGEL(b.priceGEL)}</span>
                        {b.status !== "CANCELLED" && b.endTime >= now && (
                          <form action={cancelBookingAction}>
                            <input type="hidden" name="bookingId" value={b.id} />
                            <input type="hidden" name="redirectTo" value="/club/bookings" />
                            <Button type="submit" variant="outline" size="sm">{t("cancel")}</Button>
                          </form>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted">
                      <th className="py-2 pr-4 font-medium">{t("when")}</th>
                      <th className="py-2 pr-4 font-medium">{t("clubCourt")}</th>
                      <th className="py-2 pr-4 font-medium">{t("player")}</th>
                      <th className="py-2 pr-4 font-medium">{t("price")}</th>
                      <th className="py-2 pr-4 font-medium">{t("status")}</th>
                      <th className="py-2 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b) => (
                      <tr key={b.id} className="border-b border-border last:border-0">
                        <td className="py-2 pr-4">{format(b.startTime, "d MMM HH:mm")}–{format(b.endTime, "HH:mm")}</td>
                        <td className="py-2 pr-4">{b.court.club.name} / {b.court.name}</td>
                        <td className="py-2 pr-4">
                          {b.user.name}
                          {b.user.phone ? <span className="text-muted"> · {b.user.phone}</span> : null}
                        </td>
                        <td className="py-2 pr-4">{formatGEL(b.priceGEL)}</td>
                        <td className="py-2 pr-4">
                          <Badge tone={tone[b.status as keyof typeof tone] ?? "neutral"}>
                            {b.status.toLowerCase()}
                          </Badge>
                        </td>
                        <td className="py-2">
                          {b.status !== "CANCELLED" && b.endTime >= now && (
                            <form action={cancelBookingAction}>
                              <input type="hidden" name="bookingId" value={b.id} />
                              <input type="hidden" name="redirectTo" value="/club/bookings" />
                              <Button type="submit" variant="outline" size="sm">{t("cancel")}</Button>
                            </form>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
