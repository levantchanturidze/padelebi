import Link from "next/link";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { formatGEL } from "@/lib/utils";

const ADMIN_NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/clubs", label: "Clubs" },
  { href: "/admin/users", label: "Users" },
];

export default async function AdminOverviewPage() {
  await requireRole(["PLATFORM_ADMIN"], "/admin");

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
    { label: "Users", value: users },
    { label: "Clubs", value: clubs },
    { label: "Pending approvals", value: pendingClubs, href: "/admin/clubs" },
    { label: "Bookings", value: bookings },
    { label: "Booking value", value: formatGEL(revenueAgg._sum.priceGEL ?? 0) },
  ];

  return (
    <DashboardShell
      title="Platform admin"
      subtitle="Oversee clubs, users and activity across Padelebi."
      nav={ADMIN_NAV}
      current="/admin"
    >
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
