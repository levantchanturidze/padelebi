import { getTranslations } from "next-intl/server";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { setUserRoleAction, setUserActiveAction } from "@/app/actions/admin";
import { ROLES } from "@/lib/enums";

const roleTone = { PLATFORM_ADMIN: "brand", CLUB_ADMIN: "neutral", PLAYER: "muted" } as const;

export default async function AdminUsersPage() {
  const admin = await requireRole(["PLATFORM_ADMIN"], "/admin/users");
  const t = await getTranslations("admin");

  const ADMIN_NAV = [
    { href: "/admin", label: t("overview") },
    { href: "/admin/clubs", label: t("clubs") },
    { href: "/admin/users", label: t("users") },
  ];

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { bookings: true, clubs: true } } },
  });

  return (
    <DashboardShell title={t("users")} subtitle={t("manageRoles")} nav={ADMIN_NAV} current="/admin/users">
      <Card>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="py-2 pr-4 font-medium">{t("user")}</th>
                <th className="py-2 pr-4 font-medium">{t("role")}</th>
                <th className="py-2 pr-4 font-medium">{t("activity")}</th>
                <th className="py-2 pr-4 font-medium">{t("status")}</th>
                <th className="py-2 font-medium">{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u.id === admin.id;
                return (
                  <tr key={u.id} className="border-b border-border last:border-0 align-middle">
                    <td className="py-3 pr-4">
                      <div className="font-medium">{u.name}{isSelf && <span className="text-muted"> {t("you")}</span>}</div>
                      <div className="text-muted">{u.email}</div>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge tone={roleTone[u.role as keyof typeof roleTone] ?? "neutral"}>
                        {u.role.replace("_", " ").toLowerCase()}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-muted">
                      {u._count.bookings} bookings · {u._count.clubs} clubs
                    </td>
                    <td className="py-3 pr-4">
                      <Badge tone={u.isActive ? "success" : "danger"}>
                        {u.isActive ? t("active") : t("disabled")}
                      </Badge>
                    </td>
                    <td className="py-3">
                      {!isSelf && (
                        <div className="flex items-center gap-2">
                          <form action={setUserRoleAction} className="flex items-center gap-1">
                            <input type="hidden" name="userId" value={u.id} />
                            <Select name="role" defaultValue={u.role} className="h-8 w-36 text-xs">
                              {ROLES.map((r) => (
                                <option key={r} value={r}>{r.replace("_", " ").toLowerCase()}</option>
                              ))}
                            </Select>
                            <Button type="submit" size="sm" variant="outline">{t("set")}</Button>
                          </form>
                          <form action={setUserActiveAction}>
                            <input type="hidden" name="userId" value={u.id} />
                            <input type="hidden" name="isActive" value={u.isActive ? "false" : "true"} />
                            <Button type="submit" size="sm" variant={u.isActive ? "danger" : "primary"}>
                              {u.isActive ? t("disable") : t("enable")}
                            </Button>
                          </form>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
