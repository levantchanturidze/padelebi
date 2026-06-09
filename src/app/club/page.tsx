import Link from "next/link";
import { format } from "date-fns";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { createClubAction } from "@/app/actions/club";
import { formatGEL } from "@/lib/utils";

const CLUB_NAV = [
  { href: "/club", label: "Overview" },
  { href: "/club/bookings", label: "Bookings" },
];

const statusTone = { APPROVED: "success", PENDING: "warning", SUSPENDED: "danger" } as const;

export default async function ClubOverviewPage() {
  const user = await requireRole(["CLUB_ADMIN", "PLATFORM_ADMIN"], "/club");

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
    <DashboardShell
      title="Club dashboard"
      subtitle="Manage your clubs, courts and bookings."
      nav={CLUB_NAV}
      current="/club"
    >
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent>
            <p className="text-sm text-muted">Clubs</p>
            <p className="mt-1 text-2xl font-bold">{clubs.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted">Bookings today</p>
            <p className="mt-1 text-2xl font-bold">{todaysBookings.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted">Revenue today</p>
            <p className="mt-1 text-2xl font-bold">{formatGEL(revenueToday)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Clubs */}
      <h2 className="mt-8 font-semibold">Your clubs</h2>
      <div className="mt-3 space-y-3">
        {clubs.map((club) => (
          <Card key={club.id}>
            <CardContent className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{club.name}</span>
                  <Badge tone={statusTone[club.status as keyof typeof statusTone] ?? "neutral"}>
                    {club.status.toLowerCase()}
                  </Badge>
                </div>
                <p className="mt-0.5 text-sm text-muted">
                  {club.city} · {club.courts.length} courts
                </p>
              </div>
              <Link href={`/club/${club.id}`}>
                <Button variant="outline" size="sm">Manage</Button>
              </Link>
            </CardContent>
          </Card>
        ))}
        {clubs.length === 0 && <p className="text-sm text-muted">No clubs yet. Add one below.</p>}
      </div>

      {/* Today's bookings */}
      {todaysBookings.length > 0 && (
        <>
          <h2 className="mt-8 font-semibold">Today&apos;s bookings</h2>
          <Card className="mt-3">
            <CardContent>
              {todaysBookings.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between border-b border-border py-2 text-sm last:border-0"
                >
                  <span>
                    {format(b.startTime, "HH:mm")}–{format(b.endTime, "HH:mm")} ·{" "}
                    {b.court.club.name} / {b.court.name}
                  </span>
                  <span className="text-muted">{b.user.name}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}

      {/* Add club */}
      <h2 className="mt-8 font-semibold">Add a new club</h2>
      <Card className="mt-3">
        <CardContent>
          <form action={createClubAction} className="grid max-w-xl gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="name">Club name</Label>
              <Input id="name" name="name" required />
            </div>
            <div>
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" required />
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Input id="address" name="address" required />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit">Create club (pending approval)</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
