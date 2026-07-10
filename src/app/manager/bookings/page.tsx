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

export default async function ManagerBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; facilityId?: string; courtId?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const { from, to, status } = sp;
  // Accept legacy `courtId` query for back-compat with bookmarks/external links.
  const facilityIdParam = sp.facilityId ?? sp.courtId;
  const user = await requireRole(["CLUB_ADMIN", "PLATFORM_ADMIN"], "/manager/bookings");
  const t = await getTranslations("club");

  const MANAGER_NAV = [
    { href: "/manager", label: t("overview") },
    { href: "/manager/bookings", label: t("bookings") },
  ];

  const venues = await prisma.venue.findMany({
    where: user.role === "PLATFORM_ADMIN" ? {} : { ownerId: user.id },
    select: { id: true },
  });
  const venueIds = venues.map((c) => c.id);

  const facilities = await prisma.facility.findMany({
    where: { venueId: { in: venueIds } },
    select: { id: true, name: true, venue: { select: { name: true } } },
    orderBy: [{ venue: { name: "asc" } }, { name: "asc" }],
  });

  // Only filter by facilityId if it belongs to this user's venues
  const facilityId = facilityIdParam && facilities.some((c) => c.id === facilityIdParam) ? facilityIdParam : undefined;

  const fromDate = from ? parseLocalDate(from) : null;
  const toDate = to ? parseLocalDate(to, true) : null;
  const startTimeFilter: { gte?: Date; lte?: Date } = {};
  if (fromDate) startTimeFilter.gte = fromDate;
  if (toDate) startTimeFilter.lte = toDate;
  const activeStatus = status && status !== "all" ? status : undefined;

  const bookings = await prisma.booking.findMany({
    where: {
      facility: { venueId: { in: venueIds } },
      ...(facilityId ? { facilityId } : {}),
      ...(activeStatus ? { status: activeStatus } : {}),
      ...(Object.keys(startTimeFilter).length ? { startTime: startTimeFilter } : {}),
    },
    include: {
      facility: { include: { venue: true } },
      user: true,
      discountCode: true,
    },
    orderBy: { startTime: "desc" },
    take: 300,
  });

  const now = new Date();
  const hasFilters = !!(from || to || facilityId || activeStatus);

  return (
    <DashboardShell title={t("bookings")} subtitle={t("allBookings")} nav={MANAGER_NAV} current="/manager/bookings">

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
              <label className="text-xs font-medium text-muted">{t("court")}</label>
              <select
                name="facilityId"
                defaultValue={facilityIdParam ?? ""}
                className="h-9 rounded-[var(--radius-md)] border border-border bg-background px-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
              >
                <option value="">{t("allCourts")}</option>
                {facilities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {venues.length > 1 ? `${c.venue.name} / ${c.name}` : c.name}
                  </option>
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
                href="/manager/bookings"
                className="h-9 inline-flex items-center px-3 text-sm text-muted hover:text-foreground transition-colors"
              >
                {t("clearFilter")}
              </a>
            )}
          </form>
        </CardContent>
      </Card>

      <p className="mb-3 text-sm text-muted">
        {t("showingBookings", { count: bookings.length })}
      </p>

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
                        <p className="mt-0.5 text-muted">{b.facility.venue.name} / {b.facility.name}</p>
                      </div>
                      <Badge tone={tone[b.status as keyof typeof tone] ?? "neutral"}>
                        {b.status.toLowerCase()}
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div>
                        <p>{b.user.name}</p>
                        {b.user.phone && <p className="text-muted">{b.user.phone}</p>}
                        {b.notes && (
                          <p className="mt-1 italic text-muted">&quot;{b.notes}&quot;</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{formatGEL(b.priceGEL)}</span>
                        {b.discountAmountGEL && b.discountAmountGEL > 0 && (
                          <span
                            className="rounded-full border border-brand-500 bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700"
                            title={b.discountCode?.code ?? undefined}
                          >
                            −{formatGEL(b.discountAmountGEL)}
                          </span>
                        )}
                        {b.status !== "CANCELLED" && b.endTime >= now && (
                          <form action={cancelBookingAction}>
                            <input type="hidden" name="bookingId" value={b.id} />
                            <input type="hidden" name="redirectTo" value="/manager/bookings" />
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
                      <th className="py-2 pr-4 font-medium">{t("notes")}</th>
                      <th className="py-2 pr-4 font-medium">{t("price")}</th>
                      <th className="py-2 pr-4 font-medium">{t("status")}</th>
                      <th className="py-2 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b) => (
                      <tr key={b.id} className="border-b border-border last:border-0">
                        <td className="py-2.5 pr-4 whitespace-nowrap">{format(b.startTime, "d MMM HH:mm")}–{format(b.endTime, "HH:mm")}</td>
                        <td className="py-2.5 pr-4">{b.facility.venue.name} / {b.facility.name}</td>
                        <td className="py-2.5 pr-4">
                          {b.user.name}
                          {b.user.phone ? <span className="text-muted"> · {b.user.phone}</span> : null}
                        </td>
                        <td className="py-2.5 pr-4 max-w-[180px] text-muted italic">
                          {b.notes ?? "—"}
                        </td>
                        <td className="py-2.5 pr-4 whitespace-nowrap">
                          {formatGEL(b.priceGEL)}
                          {b.discountAmountGEL && b.discountAmountGEL > 0 && (
                            <span
                              className="ml-1.5 rounded-full border border-brand-500 bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700"
                              title={b.discountCode?.code ?? undefined}
                            >
                              −{formatGEL(b.discountAmountGEL)}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 pr-4">
                          <Badge tone={tone[b.status as keyof typeof tone] ?? "neutral"}>
                            {b.status.toLowerCase()}
                          </Badge>
                        </td>
                        <td className="py-2.5">
                          {b.status !== "CANCELLED" && b.endTime >= now && (
                            <form action={cancelBookingAction}>
                              <input type="hidden" name="bookingId" value={b.id} />
                              <input type="hidden" name="redirectTo" value="/manager/bookings" />
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
