import { format } from "date-fns";
import { Filter } from "lucide-react";
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

function parseLocalDate(dateStr: string, endOfDay = false): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return endOfDay
    ? new Date(y, m - 1, d, 23, 59, 59, 999)
    : new Date(y, m - 1, d, 0, 0, 0, 0);
}

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; venueId?: string; clubId?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const { from, to, status } = sp;
  const venueIdParam = sp.venueId ?? sp.clubId; // accept legacy clubId
  await requireRole(["PLATFORM_ADMIN"], "/admin/bookings");
  const t = await getTranslations("admin");

  const ADMIN_NAV = [
    { href: "/admin", label: t("overview") },
    { href: "/admin/venues", label: t("clubs") },
    { href: "/admin/sports", label: t("sportsTab") },
    { href: "/admin/users", label: t("users") },
    { href: "/admin/bookings", label: t("bookings") },
  ];

  const allVenues = await prisma.venue.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const venueId = venueIdParam && allVenues.some((c) => c.id === venueIdParam) ? venueIdParam : undefined;
  const fromDate = from ? parseLocalDate(from) : null;
  const toDate = to ? parseLocalDate(to, true) : null;
  const startTimeFilter: { gte?: Date; lte?: Date } = {};
  if (fromDate) startTimeFilter.gte = fromDate;
  if (toDate) startTimeFilter.lte = toDate;
  const activeStatus = status && status !== "all" ? status : undefined;

  const bookings = await prisma.booking.findMany({
    where: {
      ...(venueId ? { facility: { venueId } } : {}),
      ...(activeStatus ? { status: activeStatus } : {}),
      ...(Object.keys(startTimeFilter).length ? { startTime: startTimeFilter } : {}),
    },
    include: { facility: { include: { venue: true } }, user: true },
    orderBy: { startTime: "desc" },
    take: 500,
  });

  const filteredRevenue = bookings
    .filter((b) => b.status !== "CANCELLED")
    .reduce((sum, b) => sum + b.priceGEL, 0);

  const now = new Date();
  const hasFilters = !!(from || to || venueId || activeStatus);

  return (
    <DashboardShell title={t("bookingsList")} subtitle="" nav={ADMIN_NAV} current="/admin/bookings">

      {/* Filter bar */}
      <Card className="mb-5">
        <CardContent className="py-3">
          <form method="GET" className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted">From</label>
              <input
                name="from"
                type="date"
                defaultValue={from ?? ""}
                className="h-9 rounded-[var(--radius-md)] border border-border bg-background px-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted">To</label>
              <input
                name="to"
                type="date"
                defaultValue={to ?? ""}
                className="h-9 rounded-[var(--radius-md)] border border-border bg-background px-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted">{t("clubs")}</label>
              <select
                name="venueId"
                defaultValue={venueIdParam ?? ""}
                className="h-9 rounded-[var(--radius-md)] border border-border bg-background px-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
              >
                <option value="">{t("allClubs")}</option>
                {allVenues.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted">{t("status")}</label>
              <select
                name="status"
                defaultValue={status ?? "all"}
                className="h-9 rounded-[var(--radius-md)] border border-border bg-background px-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
              >
                <option value="all">{t("allStatuses")}</option>
                <option value="CONFIRMED">confirmed</option>
                <option value="CANCELLED">cancelled</option>
              </select>
            </div>
            <Button type="submit" size="sm" className="gap-1.5">
              <Filter className="h-3.5 w-3.5" />
              {t("filterBtn")}
            </Button>
            {hasFilters && (
              <a
                href="/admin/bookings"
                className="h-9 inline-flex items-center px-3 text-sm text-muted hover:text-foreground transition-colors"
              >
                {t("clearFilter")}
              </a>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Summary row */}
      <div className="mb-3 flex flex-wrap items-center gap-4 text-sm">
        <span className="text-muted">{t("showingBookings", { count: bookings.length })}</span>
        {bookings.length > 0 && (
          <span className="font-medium text-brand-600">
            {t("revenueFiltered")}: {formatGEL(filteredRevenue)}
          </span>
        )}
      </div>

      <Card>
        <CardContent>
          {bookings.length === 0 ? (
            <p className="text-sm text-muted">No bookings found.</p>
          ) : (
            <>
              {/* Mobile card list */}
              <div className="space-y-3 sm:hidden">
                {bookings.map((b) => (
                  <div key={b.id} className="rounded-[var(--radius-md)] border border-border p-4 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{format(b.startTime, "d MMM HH:mm")}–{format(b.endTime, "HH:mm")}</p>
                        <p className="mt-0.5 text-muted">{b.facility.venue.name} / {b.facility.name}</p>
                      </div>
                      <Badge tone={tone[b.status as keyof typeof tone] ?? "neutral"}>
                        {b.status.toLowerCase()}
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div>
                        <p>{b.user.name}</p>
                        <p className="text-muted">{b.user.email}</p>
                        {b.notes && <p className="mt-1 italic text-muted">&quot;{b.notes}&quot;</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{formatGEL(b.priceGEL)}</span>
                        {b.status !== "CANCELLED" && b.endTime >= now && (
                          <form action={cancelBookingAction}>
                            <input type="hidden" name="bookingId" value={b.id} />
                            <input type="hidden" name="redirectTo" value="/admin/bookings" />
                            <Button type="submit" variant="outline" size="sm">Cancel</Button>
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
                      <th className="py-2 pr-4 font-medium">When</th>
                      <th className="py-2 pr-4 font-medium">Venue / Facility</th>
                      <th className="py-2 pr-4 font-medium">Player</th>
                      <th className="py-2 pr-4 font-medium">Notes</th>
                      <th className="py-2 pr-4 font-medium">Price</th>
                      <th className="py-2 pr-4 font-medium">Status</th>
                      <th className="py-2 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b) => (
                      <tr key={b.id} className="border-b border-border last:border-0">
                        <td className="py-2.5 pr-4 whitespace-nowrap">
                          {format(b.startTime, "d MMM HH:mm")}–{format(b.endTime, "HH:mm")}
                        </td>
                        <td className="py-2.5 pr-4">
                          {b.facility.venue.name} / {b.facility.name}
                        </td>
                        <td className="py-2.5 pr-4">
                          <div>{b.user.name}</div>
                          <div className="text-muted">{b.user.email}</div>
                        </td>
                        <td className="py-2.5 pr-4 max-w-[160px] italic text-muted">
                          {b.notes ?? "—"}
                        </td>
                        <td className="py-2.5 pr-4 whitespace-nowrap">{formatGEL(b.priceGEL)}</td>
                        <td className="py-2.5 pr-4">
                          <Badge tone={tone[b.status as keyof typeof tone] ?? "neutral"}>
                            {b.status.toLowerCase()}
                          </Badge>
                        </td>
                        <td className="py-2.5">
                          {b.status !== "CANCELLED" && b.endTime >= now && (
                            <form action={cancelBookingAction}>
                              <input type="hidden" name="bookingId" value={b.id} />
                              <input type="hidden" name="redirectTo" value="/admin/bookings" />
                              <Button type="submit" variant="outline" size="sm">Cancel</Button>
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
