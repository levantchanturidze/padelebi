import { getTranslations } from "next-intl/server";
import { format } from "date-fns";
import { BadgePercent, Ticket } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { formatGEL } from "@/lib/utils";
import {
  createDiscountCodeAction,
  toggleDiscountCodeActiveAction,
  deleteDiscountCodeAction,
} from "@/app/actions/admin";

export default async function AdminDiscountCodesPage() {
  await requireRole(["PLATFORM_ADMIN"], "/admin/discount-codes");
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

  const codes = await prisma.discountCode.findMany({
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
  });

  const now = new Date();

  return (
    <DashboardShell
      title={tRoot("adminDiscount.title")}
      subtitle={tRoot("adminDiscount.subtitle")}
      nav={ADMIN_NAV}
      current="/admin/discount-codes"
    >
      {/* Existing codes */}
      {codes.length === 0 ? (
        <Card>
          <CardContent className="flex items-center gap-3 text-sm text-muted">
            <Ticket className="h-4 w-4" />
            {tRoot("adminDiscount.empty")}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {codes.map((c) => {
            const expired = c.expiresAt !== null && c.expiresAt < now;
            const exhausted = c.maxUses !== null && c.usedCount >= c.maxUses;
            const dead = !c.isActive || expired || exhausted;
            const remaining = c.maxUses !== null ? Math.max(0, c.maxUses - c.usedCount) : null;

            return (
              <Card key={c.id} className={dead ? "opacity-70" : ""}>
                <CardContent>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <BadgePercent className="h-4 w-4 text-brand-700" />
                        <span className="font-mono text-lg font-semibold tracking-wide">{c.code}</span>
                        <Badge tone={dead ? "muted" : "success"}>
                          {dead ? tRoot("adminDiscount.inactive") : tRoot("adminDiscount.active")}
                        </Badge>
                        {expired && <Badge tone="muted">{tRoot("adminDiscount.expired")}</Badge>}
                        {exhausted && <Badge tone="muted">{tRoot("adminDiscount.exhausted")}</Badge>}
                      </div>
                      <p className="mt-1 text-sm text-muted">
                        {c.type === "PERCENT"
                          ? tRoot("adminDiscount.percentOff", { value: c.value })
                          : tRoot("adminDiscount.fixedOff", { amount: formatGEL(c.value) })}
                        {c.minAmountGEL !== null && (
                          <>
                            {" · "}
                            {tRoot("adminDiscount.minAmountLabel", { amount: formatGEL(c.minAmountGEL) })}
                          </>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {tRoot("adminDiscount.used", { used: c.usedCount })}
                        {remaining !== null && (
                          <>
                            {" · "}
                            {tRoot("adminDiscount.remaining", { count: remaining })}
                          </>
                        )}
                        {c.perUserMax !== null && (
                          <>
                            {" · "}
                            {tRoot("adminDiscount.perUser", { count: c.perUserMax })}
                          </>
                        )}
                        {c.expiresAt && (
                          <>
                            {" · "}
                            {tRoot("adminDiscount.expiresAtLabel", {
                              date: format(c.expiresAt, "d MMM yyyy"),
                            })}
                          </>
                        )}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <form action={toggleDiscountCodeActiveAction}>
                        <input type="hidden" name="codeId" value={c.id} />
                        <input type="hidden" name="isActive" value={c.isActive ? "false" : "true"} />
                        <Button type="submit" size="sm" variant={c.isActive ? "danger" : "primary"}>
                          {c.isActive ? tRoot("adminDiscount.disable") : tRoot("adminDiscount.enable")}
                        </Button>
                      </form>
                      <form action={deleteDiscountCodeAction}>
                        <input type="hidden" name="codeId" value={c.id} />
                        <Button type="submit" size="sm" variant="outline">
                          {tRoot("adminDiscount.delete")}
                        </Button>
                      </form>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create form */}
      <h2 className="mt-8 font-semibold">{tRoot("adminDiscount.createNew")}</h2>
      <Card className="mt-3">
        <CardContent>
          <form action={createDiscountCodeAction} className="grid max-w-2xl gap-3 sm:grid-cols-2">
            <div>
              <Label>{tRoot("adminDiscount.code")}</Label>
              <Input
                name="code"
                placeholder="LAUNCH25"
                required
                minLength={3}
                maxLength={32}
                pattern="^[A-Za-z0-9_-]+$"
                className="font-mono uppercase"
              />
            </div>
            <div>
              <Label>{tRoot("adminDiscount.type")}</Label>
              <Select name="type" defaultValue="PERCENT">
                <option value="PERCENT">{tRoot("adminDiscount.percent")}</option>
                <option value="FIXED">{tRoot("adminDiscount.fixed")}</option>
              </Select>
            </div>
            <div>
              <Label>{tRoot("adminDiscount.value")}</Label>
              <Input name="value" type="number" min={1} defaultValue={10} required />
              <p className="mt-1 text-[11px] text-muted">
                {tRoot("adminDiscount.valueHelper")}
              </p>
            </div>
            <div>
              <Label>{tRoot("adminDiscount.minAmount")}</Label>
              <Input name="minAmountGEL" type="number" min={1} placeholder="—" />
            </div>
            <div>
              <Label>{tRoot("adminDiscount.maxUses")}</Label>
              <Input name="maxUses" type="number" min={1} placeholder={tRoot("adminDiscount.unlimited")} />
            </div>
            <div>
              <Label>{tRoot("adminDiscount.perUserMax")}</Label>
              <Input name="perUserMax" type="number" min={1} defaultValue={1} />
            </div>
            <div className="sm:col-span-2">
              <Label>{tRoot("adminDiscount.expiresAt")}</Label>
              <Input name="expiresAt" type="datetime-local" />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit">{tRoot("adminDiscount.create")}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
