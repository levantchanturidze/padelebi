import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { setClubStatusAction } from "@/app/actions/admin";

const tone = { APPROVED: "success", PENDING: "warning", SUSPENDED: "danger" } as const;

function StatusButton({ clubId, status, label, variant }: { clubId: string; status: string; label: string; variant: "primary" | "outline" | "danger" }) {
  return (
    <form action={setClubStatusAction}>
      <input type="hidden" name="clubId" value={clubId} />
      <input type="hidden" name="status" value={status} />
      <Button type="submit" size="sm" variant={variant}>{label}</Button>
    </form>
  );
}

export default async function AdminClubsPage() {
  await requireRole(["PLATFORM_ADMIN"], "/admin/clubs");
  const t = await getTranslations("admin");

  const ADMIN_NAV = [
    { href: "/admin", label: t("overview") },
    { href: "/admin/clubs", label: t("clubs") },
    { href: "/admin/users", label: t("users") },
  ];

  const clubs = await prisma.club.findMany({
    include: { owner: true, courts: true },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return (
    <DashboardShell title={t("clubs")} subtitle={t("approvePending")} nav={ADMIN_NAV} current="/admin/clubs">
      <div className="space-y-3">
        {clubs.map((club) => (
          <Card key={club.id}>
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{club.name}</span>
                  <Badge tone={tone[club.status as keyof typeof tone] ?? "neutral"}>
                    {club.status.toLowerCase()}
                  </Badge>
                </div>
                <p className="mt-0.5 text-sm text-muted">
                  {club.city} · {club.courts.length} courts · owner {club.owner.name} ({club.owner.email})
                </p>
              </div>
              <div className="flex items-center gap-2">
                {club.status === "APPROVED" && (
                  <Link href={`/clubs/${club.slug}`} className="text-sm text-brand-600 hover:underline">
                    {t("view")}
                  </Link>
                )}
                {club.status !== "APPROVED" && (
                  <StatusButton clubId={club.id} status="APPROVED" label={t("approve")} variant="primary" />
                )}
                {club.status !== "SUSPENDED" ? (
                  <StatusButton clubId={club.id} status="SUSPENDED" label={t("suspend")} variant="danger" />
                ) : (
                  <StatusButton clubId={club.id} status="APPROVED" label={t("reinstate")} variant="outline" />
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardShell>
  );
}
