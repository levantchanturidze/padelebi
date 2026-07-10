import Link from "next/link";
import { format } from "date-fns";
import { Building2, CalendarDays, TrendingUp, Banknote, ArrowRight, Activity, Clock, Trophy } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { createVenueAction } from "@/app/actions/venue";
import { formatGEL } from "@/lib/utils";
import { AMENITIES, AMENITY_LABELS } from "@/lib/enums";

const statusTone = { APPROVED: "success", PENDING: "warning", SUSPENDED: "danger" } as const;

function StatCard({
  label,
  value,
  icon,
  accent = false,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <Card className={accent ? "border-brand-200 bg-gradient-to-br from-brand-50 to-surface" : ""}>
      <CardContent>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted">{label}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
          </div>
          <div className={[
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)]",
            accent ? "bg-brand-100 text-brand-600" : "bg-background text-muted",
          ].join(" ")}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function ManagerOverviewPage() {
  const user = await requireRole(["CLUB_ADMIN", "PLATFORM_ADMIN"], "/manager");
  const t = await getTranslations("club");
  const tRoot = await getTranslations();

  const MANAGER_NAV = [
    { href: "/manager", label: t("overview") },
    { href: "/manager/bookings", label: t("bookings") },
  ];

  const venues = await prisma.venue.findMany({
    where: user.role === "PLATFORM_ADMIN" ? {} : { ownerId: user.id },
    include: { facilities: { include: { schedules: true } } },
    orderBy: { createdAt: "desc" },
  });
  const venueIds = venues.map((c) => c.id);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  // 7-day window for chart (last 7 days including today)
  const sevenDaysAgo = new Date(todayStart);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

  // 30-day analytics window
  const thirtyDaysAgo = new Date(todayStart);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Upcoming 3 days for the schedule preview
  const threeDaysEnd = new Date(todayStart);
  threeDaysEnd.setDate(threeDaysEnd.getDate() + 3);

  const [todaysBookings, weekBookingsRaw, upcomingBookings, monthBookingsRaw] = await Promise.all([
    prisma.booking.findMany({
      where: {
        facility: { venueId: { in: venueIds } },
        status: { not: "CANCELLED" },
        startTime: { gte: todayStart, lt: todayEnd },
      },
      include: { facility: { include: { venue: true } }, user: true },
      orderBy: { startTime: "asc" },
    }),
    prisma.booking.findMany({
      where: {
        facility: { venueId: { in: venueIds } },
        status: { not: "CANCELLED" },
        startTime: { gte: sevenDaysAgo, lt: todayEnd },
      },
      select: { startTime: true, priceGEL: true },
    }),
    prisma.booking.findMany({
      where: {
        facility: { venueId: { in: venueIds } },
        status: { not: "CANCELLED" },
        startTime: { gte: now, lt: threeDaysEnd },
      },
      include: { facility: { include: { venue: true } }, user: true },
      orderBy: { startTime: "asc" },
      take: 30,
    }),
    // 30-day window for occupancy + top slot + top facility.
    prisma.booking.findMany({
      where: {
        facility: { venueId: { in: venueIds } },
        status: { not: "CANCELLED" },
        startTime: { gte: thirtyDaysAgo, lt: todayStart },
      },
      select: {
        startTime: true,
        endTime: true,
        facilityId: true,
        facility: { select: { name: true, bookingModel: true } },
      },
    }),
  ]);

  const revenueToday = todaysBookings.reduce((sum, b) => sum + b.priceGEL, 0);

  // Build 7-day chart data
  const revenueByDay = new Map<string, number>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayStart);
    d.setDate(d.getDate() - i);
    revenueByDay.set(format(d, "yyyy-MM-dd"), 0);
  }
  for (const b of weekBookingsRaw) {
    const key = format(b.startTime, "yyyy-MM-dd");
    if (revenueByDay.has(key)) revenueByDay.set(key, revenueByDay.get(key)! + b.priceGEL);
  }
  const chartDays = Array.from(revenueByDay.entries()).map(([dateStr, revenue]) => ({
    dateStr,
    label: format(new Date(dateStr + "T12:00:00"), "EEE"),
    isToday: dateStr === format(todayStart, "yyyy-MM-dd"),
    revenue,
  }));
  const maxRevenue = Math.max(...chartDays.map((d) => d.revenue), 1);
  const weekRevenue = chartDays.reduce((sum, d) => sum + d.revenue, 0);

  // Group upcoming bookings by date
  const upcomingByDay = new Map<string, typeof upcomingBookings>();
  for (const b of upcomingBookings) {
    const key = format(b.startTime, "yyyy-MM-dd");
    if (!upcomingByDay.has(key)) upcomingByDay.set(key, []);
    upcomingByDay.get(key)!.push(b);
  }

  // ── 30-day analytics ────────────────────────────────────────────────────
  const timeSlotBookings = monthBookingsRaw.filter((b) => b.facility.bookingModel === "TIME_SLOT");

  // Occupancy: booked hours / available hours over the last 30 days.
  // Available = sum over TIME_SLOT facilities of weekly slot minutes × (30 / 7).
  let availableMinutes30d = 0;
  for (const venue of venues) {
    for (const facility of venue.facilities) {
      if (facility.bookingModel !== "TIME_SLOT") continue;
      const weekMinutes = facility.schedules.reduce(
        (sum, s) => sum + (s.closeMinutes - s.openMinutes),
        0,
      );
      availableMinutes30d += (weekMinutes * 30) / 7;
    }
  }
  const bookedMinutes30d = timeSlotBookings.reduce(
    (sum, b) => sum + (b.endTime.getTime() - b.startTime.getTime()) / 60_000,
    0,
  );
  const occupancyPct =
    availableMinutes30d > 0
      ? Math.round((bookedMinutes30d / availableMinutes30d) * 100)
      : 0;

  // Top slot: day-of-week × hour combo with the most bookings.
  const slotCounts = new Map<string, number>(); // key = `${day}_${hour}`
  for (const b of timeSlotBookings) {
    const key = `${b.startTime.getDay()}_${b.startTime.getHours()}`;
    slotCounts.set(key, (slotCounts.get(key) ?? 0) + 1);
  }
  let topSlotLabel = "—";
  let topSlotCount = 0;
  if (slotCounts.size > 0) {
    const [topKey, topCount] = Array.from(slotCounts.entries()).sort((a, b) => b[1] - a[1])[0];
    const [dayStr, hourStr] = topKey.split("_");
    const day = Number(dayStr);
    const hour = Number(hourStr);
    const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    topSlotLabel = `${weekdayNames[day]} ${String(hour).padStart(2, "0")}:00`;
    topSlotCount = topCount;
  }

  // Top facility: most-booked facility over the last 30 days.
  const facilityCounts = new Map<string, { name: string; count: number }>();
  for (const b of monthBookingsRaw) {
    const cur = facilityCounts.get(b.facilityId);
    if (cur) cur.count++;
    else facilityCounts.set(b.facilityId, { name: b.facility.name, count: 1 });
  }
  const topFacility =
    Array.from(facilityCounts.values()).sort((a, b) => b.count - a.count)[0] ?? null;

  return (
    <DashboardShell title={t("title")} subtitle={t("desc")} nav={MANAGER_NAV} current="/manager">

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("clubsCount")} value={String(venues.length)} icon={<Building2 className="h-4.5 w-4.5" />} />
        <StatCard label={t("bookingsToday")} value={String(todaysBookings.length)} icon={<CalendarDays className="h-4.5 w-4.5" />} />
        <StatCard label={t("revenueToday")} value={formatGEL(revenueToday)} icon={<Banknote className="h-4.5 w-4.5" />} />
        <StatCard label={t("revenueWeek")} value={formatGEL(weekRevenue)} icon={<TrendingUp className="h-4.5 w-4.5" />} accent />
      </div>

      {/* 7-day revenue chart */}
      <Card className="mt-5">
        <CardContent>
          <p className="mb-4 text-sm font-semibold">{t("revenueWeek")}</p>
          <div className="flex items-end justify-between gap-1.5" style={{ height: "88px" }}>
            {chartDays.map((day) => {
              const pct = (day.revenue / maxRevenue) * 100;
              const barH = Math.max(pct, day.revenue > 0 ? 6 : 0);
              return (
                <div key={day.dateStr} className="flex flex-1 flex-col items-center justify-end gap-1">
                  <span className="text-[10px] font-medium text-muted leading-none">
                    {day.revenue > 0 ? formatGEL(day.revenue) : ""}
                  </span>
                  <div className="relative w-full overflow-hidden rounded-t-[3px]" style={{ height: "56px" }}>
                    <div
                      className={[
                        "absolute bottom-0 w-full transition-all",
                        day.isToday
                          ? "bg-gradient-to-t from-brand-600 to-brand-400"
                          : "bg-gradient-to-t from-brand-300 to-brand-200",
                      ].join(" ")}
                      style={{ height: `${barH}%` }}
                    />
                    {day.revenue === 0 && (
                      <div className="absolute bottom-0 h-0.5 w-full rounded bg-border" />
                    )}
                  </div>
                  <span className={["text-[10px] leading-none", day.isToday ? "font-semibold text-brand-600" : "text-muted"].join(" ")}>
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 30-day analytics */}
      <div className="mt-6">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-cobalt-600">
          {tRoot("analytics.title")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label={tRoot("analytics.occupancy")}
            value={`${occupancyPct}%`}
            icon={<Activity className="h-4.5 w-4.5" />}
          />
          <StatCard
            label={tRoot("analytics.topSlot")}
            value={topSlotLabel}
            icon={<Clock className="h-4.5 w-4.5" />}
          />
          <StatCard
            label={tRoot("analytics.topFacility")}
            value={topFacility?.name ?? "—"}
            icon={<Trophy className="h-4.5 w-4.5" />}
          />
        </div>
        <p className="mt-2 text-[11px] text-muted">
          {tRoot("analytics.window")}
          {topSlotCount > 0 && (
            <>
              {" "}
              · {tRoot("analytics.topSlotHint", { count: topSlotCount })}
            </>
          )}
          {topFacility && (
            <>
              {" "}
              · {tRoot("analytics.topFacilityHint", { count: topFacility.count })}
            </>
          )}
        </p>
      </div>

      {/* Upcoming bookings */}
      <div className="mt-6 flex items-center justify-between">
        <h2 className="font-semibold">{t("upcomingBookings")}</h2>
        <Link href="/manager/bookings" className="text-sm text-brand-600 hover:underline">{t("bookings")} →</Link>
      </div>

      {upcomingBookings.length === 0 ? (
        <p className="mt-3 text-sm text-muted">{t("noUpcoming")}</p>
      ) : (
        <div className="mt-3 space-y-4">
          {Array.from(upcomingByDay.entries()).map(([dateKey, dayBookings]) => (
            <div key={dateKey}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                {format(new Date(dateKey + "T12:00:00"), "EEEE, d MMMM")}
              </p>
              <Card>
                <CardContent className="py-2">
                  {dayBookings.map((b, i) => (
                    <div
                      key={b.id}
                      className={[
                        "flex items-center justify-between gap-3 py-2 text-sm",
                        i < dayBookings.length - 1 ? "border-b border-border" : "",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-medium tabular-nums">
                          {format(b.startTime, "HH:mm")}–{format(b.endTime, "HH:mm")}
                        </span>
                        <span className="text-muted">{b.facility.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span>{b.user.name}</span>
                        <span className="font-medium text-brand-600">{formatGEL(b.priceGEL)}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* Your venues */}
      <h2 className="mt-8 font-semibold">{t("yourClubs")}</h2>
      <div className="mt-3 space-y-3">
        {venues.map((venue) => (
          <Link key={venue.id} href={`/manager/${venue.id}?tab=profile`} className="group block">
            <Card className="transition-all duration-150 group-hover:shadow-card-md">
              <CardContent className="flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{venue.name}</span>
                    <Badge tone={statusTone[venue.status as keyof typeof statusTone] ?? "neutral"}>
                      {venue.status.toLowerCase()}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-sm text-muted">{venue.city} · {venue.facilities.length} courts</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
              </CardContent>
            </Card>
          </Link>
        ))}
        {venues.length === 0 && <p className="text-sm text-muted">{t("noClubs")}</p>}
      </div>

      {/* Add new venue */}
      <h2 className="mt-8 font-semibold">{t("addNewClub")}</h2>
      <Card className="mt-3">
        <CardContent>
          <form action={createVenueAction} className="grid max-w-xl gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="name">{t("clubName")}</Label>
              <Input id="name" name="name" required />
            </div>
            <div>
              <Label htmlFor="city">{t("city")}</Label>
              <Input id="city" name="city" required />
            </div>
            <div>
              <Label htmlFor="district">{tRoot("filters.district")}</Label>
              <Input
                id="district"
                name="district"
                placeholder={tRoot("filters.districtPlaceholder")}
                list="venue-create-districts"
              />
              <datalist id="venue-create-districts">
                {[
                  "საბურთალო", "ვაკე", "დიდუბე", "მარჯანიშვილი", "გლდანი",
                  "ნაძალადევი", "წყნეთი", "ისანი", "ვაზისუბანი",
                ].map((d) => <option key={d} value={d} />)}
              </datalist>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="address">{t("address")}</Label>
              <Input id="address" name="address" required />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="description">{t("description")}</Label>
              <Textarea id="description" name="description" />
            </div>
            <div className="sm:col-span-2">
              <Label>{t("amenitiesLabel")}</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {AMENITIES.map((a) => (
                  <label key={a} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name={`amenity_${a}`}
                      className="h-4 w-4 accent-[var(--color-brand-500)]"
                    />
                    {tRoot(`clubs.amenityLabels.${a}` as never) ?? AMENITY_LABELS[a]}
                  </label>
                ))}
              </div>
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
