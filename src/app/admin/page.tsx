import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Users, Building2, AlertCircle, CalendarDays, TrendingUp } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { setVenueStatusAction } from "@/app/actions/admin";
import { formatGEL } from "@/lib/utils";

const roleTone = { PLATFORM_ADMIN: "brand", CLUB_ADMIN: "neutral", PLAYER: "muted" } as const;

function StatCard({
  label,
  value,
  icon,
  href,
  accent,
  warn,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  href?: string;
  accent?: boolean;
  warn?: boolean;
}) {
  const inner = (
    <Card className={[
      "transition-all duration-150",
      href ? "hover:shadow-card-md" : "",
      accent ? "border-brand-200 bg-gradient-to-br from-brand-50 to-surface" : "",
      warn ? "border-warning/40 bg-amber-50" : "",
    ].join(" ")}>
      <CardContent>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted">{label}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
          </div>
          <div className={[
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)]",
            accent ? "bg-brand-100 text-brand-600" :
            warn ? "bg-amber-100 text-warning" :
            "bg-background text-muted",
          ].join(" ")}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{inner}</Link> : <div>{inner}</div>;
}

function StatusButton({ venueId, status, label, variant }: {
  venueId: string;
  status: string;
  label: string;
  variant: "primary" | "outline" | "danger";
}) {
  return (
    <form action={setVenueStatusAction}>
      <input type="hidden" name="venueId" value={venueId} />
      <input type="hidden" name="status" value={status} />
      <Button type="submit" size="sm" variant={variant}>{label}</Button>
    </form>
  );
}

export default async function AdminOverviewPage() {
  await requireRole(["PLATFORM_ADMIN"], "/admin");
  const t = await getTranslations("admin");

  const tRoot = await getTranslations();
  const ADMIN_NAV = [
    { href: "/admin", label: t("overview") },
    { href: "/admin/venues", label: t("clubs") },
    { href: "/admin/sports", label: t("sportsTab") },
    { href: "/admin/users", label: t("users") },
    { href: "/admin/bookings", label: t("bookings") },
    { href: "/admin/discount-codes", label: tRoot("adminDiscount.tab") },
  ];

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  weekStart.setHours(0, 0, 0, 0);

  const [
    totalUsers,
    totalVenues,
    pendingVenues,
    totalBookings,
    revenueAgg,
    newUsersWeek,
    newBookingsWeek,
    recentUsers,
    pendingVenuesList,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.venue.count(),
    prisma.venue.count({ where: { status: "PENDING" } }),
    prisma.booking.count({ where: { status: { not: "CANCELLED" } } }),
    prisma.booking.aggregate({
      where: { status: { not: "CANCELLED" } },
      _sum: { priceGEL: true },
    }),
    prisma.user.count({ where: { createdAt: { gte: weekStart } } }),
    prisma.booking.count({ where: { status: { not: "CANCELLED" }, createdAt: { gte: weekStart } } }),
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
    prisma.venue.findMany({
      where: { status: "PENDING" },
      include: { owner: true, facilities: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return (
    <DashboardShell title={t("title")} subtitle={t("desc")} nav={ADMIN_NAV} current="/admin">

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard label={t("usersLabel")} value={totalUsers} icon={<Users className="h-4.5 w-4.5" />} href="/admin/users" />
        <StatCard label={t("clubsLabel")} value={totalVenues} icon={<Building2 className="h-4.5 w-4.5" />} href="/admin/venues" />
        <StatCard
          label={t("pendingApprovals")}
          value={pendingVenues}
          icon={<AlertCircle className="h-4.5 w-4.5" />}
          href="/admin/venues?status=PENDING"
          warn={pendingVenues > 0}
        />
        <StatCard label={t("bookings")} value={totalBookings} icon={<CalendarDays className="h-4.5 w-4.5" />} href="/admin/bookings" />
        <StatCard
          label={t("totalRevenue")}
          value={formatGEL(revenueAgg._sum.priceGEL ?? 0)}
          icon={<TrendingUp className="h-4.5 w-4.5" />}
          accent
        />
      </div>

      {/* This-week delta row */}
      <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted">
        <span className="rounded-full border border-border bg-surface px-3 py-1">
          +{newUsersWeek} {t("usersLabel").toLowerCase()} {t("newThisWeek").toLowerCase()}
        </span>
        <span className="rounded-full border border-border bg-surface px-3 py-1">
          +{newBookingsWeek} {t("bookings").toLowerCase()} {t("newThisWeek").toLowerCase()}
        </span>
      </div>

      {/* Pending venues — only shown when there are any */}
      {pendingVenuesList.length > 0 && (
        <div className="mt-6">
          <div className="rounded-[var(--radius-xl)] border border-amber-200 bg-amber-50 p-5">
            <div className="mb-4 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              <h2 className="font-semibold">{t("pendingApprovals")} ({pendingVenuesList.length})</h2>
            </div>
            <div className="space-y-2">
              {pendingVenuesList.map((venue) => (
                <div
                  key={venue.id}
                  className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{venue.name}</p>
                    <p className="mt-0.5 text-sm text-muted">
                      {venue.city} · {venue.facilities.length} courts · {venue.owner.name}
                      <span className="text-muted/70"> ({venue.owner.email})</span>
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <StatusButton venueId={venue.id} status="APPROVED" label={t("approve")} variant="primary" />
                    <StatusButton venueId={venue.id} status="SUSPENDED" label={t("suspend")} variant="danger" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent signups */}
      <div className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{t("recentSignups")}</h2>
          <Link href="/admin/users" className="text-sm text-brand-600 hover:underline">{t("users")} →</Link>
        </div>
        <Card className="mt-3">
          <CardContent className="py-1">
            {recentUsers.map((u) => (
              <div key={u.id} className="flex items-center gap-3 border-b border-border py-2.5 last:border-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{u.name}</p>
                  <p className="truncate text-xs text-muted">{u.email}</p>
                </div>
                <Badge tone={roleTone[u.role as keyof typeof roleTone] ?? "neutral"}>
                  {u.role.replace("_", " ").toLowerCase()}
                </Badge>
                <span className="hidden shrink-0 text-xs text-muted sm:block">
                  {formatDistanceToNow(u.createdAt, { addSuffix: true })}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

    </DashboardShell>
  );
}
