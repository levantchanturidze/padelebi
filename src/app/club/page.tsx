import Link from "next/link";
import { format } from "date-fns";
import { getTranslations } from "next-intl/server";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { createClubAction } from "@/app/actions/club";
import { formatGEL } from "@/lib/utils";

const statusTone = { APPROVED: "success", PENDING: "warning", SUSPENDED: "danger" } as const;

export default async function ClubOverviewPage() {
  const user = await requireRole(["CLUB_ADMIN", "PLATFORM_ADMIN"], "/club");
  const t = await getTranslations("club");

  const CLUB_NAV = [
    { href: "/club", label: t("overview") },
    { href: "/club/bookings", label: t("bookings") },
  ];

  const clubs = await prisma.club.findMany({
    where: user.role === "PLATFORM_ADMIN" ? {} : { ownerId: user.id },
    include: { courts: true },
    orderBy: { createdAt: "desc" },
  });
  const clubIds = clubs.map((c) => c.id);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const todaysBookings = await prisma.booking.findMany({
    where: {
      court: { clubId: { in: clubIds } },
      status: { not: "CANCELLED" },
      startTime: { gte: todayStart, lt: todayEnd },
    },
    include: { court: { include: { club: true } }, user: true },
    orderBy: { startTime: "asc" },
  });

  const revenueToday = todaysBookings.reduce((sum, b) => sum + b.priceGEL, 0);

  return (
    <DashboardShell title={t("title")} subtitle={t("desc")} nav={CLUB_NAV} current="/club">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent><p className="text-sm text-muted">{t("clubsCount")}</p><p className="mt-1 text-2xl font-bold">{clubs.length}</p></CardContent></Card>
        <Card><CardContent><p className="text-sm text-muted">{t("bookingsToday")}</p><p className="mt-1 text-2xl font-bold">{todaysBookings.length}</p></CardContent></Card>
        <Card><CardContent><p className="text-sm text-muted">{t("revenueToday")}</p><p className="mt-1 text-2xl font-bold">{formatGEL(revenueToday)}</p></CardContent></Card>
      </div>

      <h2 className="mt-8 font-semibold">{t("yourClubs")}</h2>
      <div className="mt-3 space-y-3">
        {clubs.map((club) => (
          <Card key={club.id}>
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{club.name}</span>
                  <Badge tone={statusTone[club.status as keyof typeof statusTone] ?? "neutral"}>
                    {club.status.toLowerCase()}
                  </Badge>
                </div>
                <p className="mt-0.5 text-sm text-muted">{club.city} · {club.courts.length} courts</p>
              </div>
              <Link href={`/club/${club.id}`}>
                <Button variant="outline" size="sm">{t("manage")}</Button>
              </Link>
            </CardContent>
          </Card>
        ))}
        {clubs.length === 0 && <p className="text-sm text-muted">{t("noClubs")}</p>}
      </div>

      {todaysBookings.length > 0 && (
        <>
          <h2 className="mt-8 font-semibold">{t("todaysBookings")}</h2>
          <Card className="mt-3">
            <CardContent>
              {todaysBookings.map((b) => (
                <div key={b.id} className="flex flex-col gap-0.5 border-b border-border py-2 text-sm last:border-0 sm:flex-row sm:items-center sm:justify-between">
                  <span>{format(b.startTime, "HH:mm")}–{format(b.endTime, "HH:mm")} · {b.court.club.name} / {b.court.name}</span>
                  <span className="text-muted">{b.user.name}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}

      <h2 className="mt-8 font-semibold">{t("addNewClub")}</h2>
      <Card className="mt-3">
        <CardContent>
          <form action={createClubAction} className="grid max-w-xl gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="name">{t("clubName")}</Label>
              <Input id="name" name="name" required />
            </div>
            <div>
              <Label htmlFor="city">{t("city")}</Label>
              <Input id="city" name="city" required />
            </div>
            <div>
              <Label htmlFor="address">{t("address")}</Label>
              <Input id="address" name="address" required />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="description">{t("description")}</Label>
              <Textarea id="description" name="description" />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit">{t("createClub")}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
