import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { formatGEL } from "@/lib/utils";

export default async function AdminOverviewPage() {
  await requireRole(["PLATFORM_ADMIN"], "/admin");
  const t = await getTranslations("admin");

  const ADMIN_NAV = [
    { href: "/admin", label: t("overview") },
    { href: "/admin/clubs", label: t("clubs") },
    { href: "/admin/users", label: t("users") },
  ];

  const [users, clubs, pendingClubs, bookings, revenueAgg] = await Promise.all([
    prisma.user.count(),
    prisma.club.count(),
    prisma.club.count({ where: { status: "PENDING" } }),
    prisma.booking.count({ where: { status: { not: "CANCELLED" } } }),
    prisma.booking.aggregate({
      where: { status: { not: "CANCELLED" } },
      _sum: { priceGEL: true },
    }),
  ]);

  const stats = [
    { label: t("usersLabel"), value: users },
    { label: t("clubsLabel"), value: clubs },
    { label: t("pendingApprovals"), value: pendingClubs, href: "/admin/clubs" },
    { label: t("bookings"), value: bookings },
    { label: t("bookingValue"), value: formatGEL(revenueAgg._sum.priceGEL ?? 0) },
  ];

  return (
    <DashboardShell title={t("title")} subtitle={t("desc")} nav={ADMIN_NAV} current="/admin">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => {
          const inner = (
            <Card className={s.href ? "transition-shadow hover:shadow-md" : ""}>
              <CardContent>
                <p className="text-sm text-muted">{s.label}</p>
                <p className="mt-1 text-2xl font-bold">{s.value}</p>
              </CardContent>
            </Card>
          );
          return s.href ? (
            <Link key={s.label} href={s.href}>{inner}</Link>
          ) : (
            <div key={s.label}>{inner}</div>
          );
        })}
      </div>
    </DashboardShell>
  );
}
