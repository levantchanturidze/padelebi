import { getTranslations } from "next-intl/server";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { SportIcon } from "@/components/sport/sport-icon";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import {
  createSportAction,
  updateSportAction,
  toggleSportActiveAction,
} from "@/app/actions/admin";
import { tSportName, tSportCategory } from "@/lib/sports";

const CATEGORIES = ["RACQUET", "TEAM", "FITNESS", "WATER", "INDIVIDUAL"] as const;

/**
 * A short, well-typed list of lucide icon names that already ship in the
 * SportIcon component. Admin picks one when adding a new sport — anything
 * outside this list falls through to the generic Activity icon.
 */
const ICON_CHOICES = [
  "Trophy",
  "Goal",
  "Target",
  "Volleyball",
  "Feather",
  "CircleDot",
  "Waves",
  "Dumbbell",
  "HeartPulse",
  "Swords",
  "Activity",
] as const;

export default async function AdminSportsPage() {
  await requireRole(["PLATFORM_ADMIN"], "/admin/sports");
  const t = await getTranslations("admin");
  const tRoot = await getTranslations();

  const ADMIN_NAV = [
    { href: "/admin", label: t("overview") },
    { href: "/admin/venues", label: t("clubs") },
    { href: "/admin/sports", label: t("sportsTab") },
    { href: "/admin/users", label: t("users") },
    { href: "/admin/bookings", label: t("bookings") },
  ];

  const sports = await prisma.sport.findMany({
    orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { facilities: true } } },
  });

  return (
    <DashboardShell title={t("sportsTab")} subtitle={t("sportsSubtitle")} nav={ADMIN_NAV} current="/admin/sports">
      <p className="mb-3 text-sm text-muted">
        {tRoot("adminSports.helper")}
      </p>

      {/* Existing sports — list with toggle + edit-in-place form */}
      <div className="space-y-3">
        {sports.map((s) => {
          const displayName = tSportName(tRoot, s.slug, s.name);
          return (
            <Card key={s.id} className={s.isActive ? "" : "opacity-70"}>
              <CardContent>
                <form action={updateSportAction} className="grid gap-3 sm:grid-cols-[auto_1fr_1fr_1fr_120px_auto]">
                  <input type="hidden" name="sportId" value={s.id} />

                  {/* Icon */}
                  <div className="grid h-10 w-10 place-items-center self-center rounded-[var(--radius-md)] bg-brand-50 text-foreground">
                    <SportIcon slug={s.slug} className="h-5 w-5" />
                  </div>

                  <div>
                    <Label>{tRoot("adminSports.name")}</Label>
                    <Input name="name" defaultValue={s.name} required />
                    <p className="mt-1 text-[11px] text-muted">{displayName}</p>
                  </div>
                  <div>
                    <Label>{tRoot("adminSports.slug")}</Label>
                    <Input name="slug" defaultValue={s.slug} required pattern="^[a-z][a-z0-9-]*$" />
                  </div>
                  <div>
                    <Label>{tRoot("adminSports.category")}</Label>
                    <Select name="category" defaultValue={s.category}>
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{tSportCategory(tRoot, c)}</option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label>{tRoot("adminSports.sortOrder")}</Label>
                    <Input name="sortOrder" type="number" min={0} defaultValue={s.sortOrder} />
                  </div>
                  <div className="flex items-end gap-2">
                    <Input name="icon" defaultValue={s.icon} className="w-32" placeholder="Trophy" />
                    <Button type="submit" size="sm" variant="outline">{tRoot("adminSports.save")}</Button>
                  </div>
                </form>

                <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm">
                  <div className="flex items-center gap-3">
                    <Badge tone={s.isActive ? "success" : "muted"}>
                      {s.isActive ? tRoot("adminSports.active") : tRoot("adminSports.hidden")}
                    </Badge>
                    <span className="text-muted">
                      {s._count.facilities} {tRoot("adminSports.facilitiesLinked")}
                    </span>
                  </div>

                  <form action={toggleSportActiveAction}>
                    <input type="hidden" name="sportId" value={s.id} />
                    <input type="hidden" name="isActive" value={s.isActive ? "false" : "true"} />
                    <Button type="submit" size="sm" variant={s.isActive ? "danger" : "primary"}>
                      {s.isActive ? tRoot("adminSports.hide") : tRoot("adminSports.show")}
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add new sport */}
      <h2 className="mt-8 font-semibold">{tRoot("adminSports.addNew")}</h2>
      <Card className="mt-3">
        <CardContent>
          <form action={createSportAction} className="grid max-w-2xl gap-3 sm:grid-cols-2">
            <div>
              <Label>{tRoot("adminSports.name")}</Label>
              <Input name="name" placeholder="Chess" required minLength={2} />
            </div>
            <div>
              <Label>{tRoot("adminSports.slug")}</Label>
              <Input
                name="slug"
                placeholder="chess"
                required
                pattern="^[a-z][a-z0-9-]*$"
                title="Lowercase letters, numbers and dashes"
              />
            </div>
            <div>
              <Label>{tRoot("adminSports.category")}</Label>
              <Select name="category" defaultValue="INDIVIDUAL">
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{tSportCategory(tRoot, c)}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>{tRoot("adminSports.icon")}</Label>
              <Select name="icon" defaultValue="Activity">
                {ICON_CHOICES.map((i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>{tRoot("adminSports.sortOrder")}</Label>
              <Input name="sortOrder" type="number" min={0} defaultValue={500} />
            </div>
            <div className="flex items-end">
              <Button type="submit">{tRoot("adminSports.create")}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
