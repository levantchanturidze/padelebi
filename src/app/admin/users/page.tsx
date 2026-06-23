import { format } from "date-fns";
import { Search } from "lucide-react";
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

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; role?: string }>;
}) {
  const admin = await requireRole(["PLATFORM_ADMIN"], "/admin/users");
  const { search = "", role = "all" } = await searchParams;
  const t = await getTranslations("admin");

  const ADMIN_NAV = [
    { href: "/admin", label: t("overview") },
    { href: "/admin/venues", label: t("clubs") },
    { href: "/admin/users", label: t("users") },
    { href: "/admin/bookings", label: t("bookings") },
  ];

  const activeRole = role !== "all" && ROLES.includes(role as never) ? role : undefined;

  const users = await prisma.user.findMany({
    where: {
      ...(search ? {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      } : {}),
      ...(activeRole ? { role: activeRole } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { bookings: true, venues: true } } },
  });

  const hasFilters = !!(search || activeRole);

  return (
    <DashboardShell title={t("users")} subtitle={t("manageRoles")} nav={ADMIN_NAV} current="/admin/users">

      {/* Filter bar */}
      <form method="GET" className="mb-5 flex flex-wrap items-end gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-[var(--radius-md)] border border-border bg-surface px-3 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-200 min-w-48">
          <Search className="h-4 w-4 shrink-0 text-muted" />
          <input
            name="search"
            type="search"
            placeholder={t("searchUsers")}
            defaultValue={search}
            className="h-9 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
          />
        </div>
        <select
          name="role"
          defaultValue={role}
          className="h-9 rounded-[var(--radius-md)] border border-border bg-surface px-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
        >
          <option value="all">{t("allRoles")}</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>{r.replace("_", " ").toLowerCase()}</option>
          ))}
        </select>
        <Button type="submit" size="sm">{t("filterBtn")}</Button>
        {hasFilters && (
          <a href="/admin/users" className="h-9 inline-flex items-center px-3 text-sm text-muted hover:text-foreground transition-colors">
            {t("clearFilter")}
          </a>
        )}
      </form>

      <p className="mb-3 text-sm text-muted">{users.length} {t("usersLabel").toLowerCase()}</p>

      <Card>
        <CardContent>
          {/* Mobile card list */}
          <div className="space-y-3 sm:hidden">
            {users.map((u) => {
              const isSelf = u.id === admin.id;
              return (
                <div key={u.id} className="rounded-[var(--radius-md)] border border-border p-4 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium">{u.name}{isSelf && <span className="text-muted"> {t("you")}</span>}</div>
                      <div className="truncate text-muted">{u.email}</div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge tone={roleTone[u.role as keyof typeof roleTone] ?? "neutral"}>
                        {u.role.replace("_", " ").toLowerCase()}
                      </Badge>
                      <Badge tone={u.isActive ? "success" : "danger"}>
                        {u.isActive ? t("active") : t("disabled")}
                      </Badge>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {u._count.bookings} bookings · {u._count.venues} venues · {t("createdAt")} {format(u.createdAt, "d MMM yyyy")}
                  </p>
                  {!isSelf && (
                    <div className="mt-3 flex flex-wrap gap-2">
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
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="py-2 pr-4 font-medium">{t("user")}</th>
                  <th className="py-2 pr-4 font-medium">{t("role")}</th>
                  <th className="py-2 pr-4 font-medium">{t("activity")}</th>
                  <th className="py-2 pr-4 font-medium">{t("createdAt")}</th>
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
                        {u._count.bookings} bookings · {u._count.venues} venues
                      </td>
                      <td className="py-3 pr-4 text-muted whitespace-nowrap">
                        {format(u.createdAt, "d MMM yyyy")}
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
            {users.length === 0 && (
              <p className="py-4 text-center text-sm text-muted">No users match your search.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
