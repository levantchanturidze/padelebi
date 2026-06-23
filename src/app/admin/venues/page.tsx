import Link from "next/link";
import { format } from "date-fns";
import { Search } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { setVenueStatusAction } from "@/app/actions/admin";
import { VENUE_STATUSES } from "@/lib/enums";

const tone = { APPROVED: "success", PENDING: "warning", SUSPENDED: "danger" } as const;
const STATUS_ORDER: Record<string, number> = { PENDING: 0, APPROVED: 1, SUSPENDED: 2 };

function StatusButton({ venueId, status, label, variant }: {
  venueId: string; status: string; label: string; variant: "primary" | "outline" | "danger";
}) {
  return (
    <form action={setVenueStatusAction}>
      <input type="hidden" name="venueId" value={venueId} />
      <input type="hidden" name="status" value={status} />
      <Button type="submit" size="sm" variant={variant}>{label}</Button>
    </form>
  );
}

export default async function AdminVenuesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string }>;
}) {
  await requireRole(["PLATFORM_ADMIN"], "/admin/venues");
  const { search = "", status = "all" } = await searchParams;
  const t = await getTranslations("admin");

  const ADMIN_NAV = [
    { href: "/admin", label: t("overview") },
    { href: "/admin/venues", label: t("clubs") },
    { href: "/admin/users", label: t("users") },
    { href: "/admin/bookings", label: t("bookings") },
  ];

  const activeStatus = status !== "all" && VENUE_STATUSES.includes(status as never) ? status : undefined;

  const venues = await prisma.venue.findMany({
    where: {
      ...(search ? {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { city: { contains: search, mode: "insensitive" } },
          { owner: { name: { contains: search, mode: "insensitive" } } },
          { owner: { email: { contains: search, mode: "insensitive" } } },
        ],
      } : {}),
      ...(activeStatus ? { status: activeStatus } : {}),
    },
    include: { owner: true, facilities: true },
    orderBy: { createdAt: "desc" },
  });

  // Sort: PENDING first (most urgent), then APPROVED, then SUSPENDED
  if (!activeStatus) {
    venues.sort((a, b) => (STATUS_ORDER[a.status] ?? 3) - (STATUS_ORDER[b.status] ?? 3));
  }

  const hasFilters = !!(search || activeStatus);

  return (
    <DashboardShell title={t("clubs")} subtitle={t("approvePending")} nav={ADMIN_NAV} current="/admin/venues">

      {/* Filter bar */}
      <form method="GET" className="mb-5 flex flex-wrap items-end gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-[var(--radius-md)] border border-border bg-surface px-3 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-200 min-w-48">
          <Search className="h-4 w-4 shrink-0 text-muted" />
          <input
            name="search"
            type="search"
            placeholder={t("searchClubs")}
            defaultValue={search}
            className="h-9 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
          />
        </div>
        <select
          name="status"
          defaultValue={status}
          className="h-9 rounded-[var(--radius-md)] border border-border bg-surface px-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
        >
          <option value="all">{t("allStatuses")}</option>
          {VENUE_STATUSES.map((s) => (
            <option key={s} value={s}>{s.toLowerCase()}</option>
          ))}
        </select>
        <Button type="submit" size="sm">{t("filterBtn")}</Button>
        {hasFilters && (
          <a href="/admin/venues" className="h-9 inline-flex items-center px-3 text-sm text-muted hover:text-foreground transition-colors">
            {t("clearFilter")}
          </a>
        )}
      </form>

      <p className="mb-3 text-sm text-muted">{venues.length} {t("clubsLabel").toLowerCase()}</p>

      <div className="space-y-3">
        {venues.map((venue) => (
          <Card key={venue.id} className={venue.status === "PENDING" ? "border-amber-200" : ""}>
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{venue.name}</span>
                  <Badge tone={tone[venue.status as keyof typeof tone] ?? "neutral"}>
                    {venue.status.toLowerCase()}
                  </Badge>
                </div>
                <p className="mt-0.5 truncate text-sm text-muted">
                  {venue.city} · {venue.facilities.length} courts · {venue.owner.name}
                  <span className="text-muted/70"> ({venue.owner.email})</span>
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {t("submittedAt")} {format(venue.createdAt, "d MMM yyyy")}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {venue.status === "APPROVED" && (
                  <Link href={`/venues/${venue.slug}`} className="text-sm text-brand-600 hover:underline">
                    {t("view")}
                  </Link>
                )}
                {venue.status !== "APPROVED" && (
                  <StatusButton venueId={venue.id} status="APPROVED" label={t("approve")} variant="primary" />
                )}
                {venue.status !== "SUSPENDED" ? (
                  <StatusButton venueId={venue.id} status="SUSPENDED" label={t("suspend")} variant="danger" />
                ) : (
                  <StatusButton venueId={venue.id} status="APPROVED" label={t("reinstate")} variant="outline" />
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {venues.length === 0 && (
          <p className="text-sm text-muted">{hasFilters ? "No venues match your search." : t("noPending")}</p>
        )}
      </div>
    </DashboardShell>
  );
}
