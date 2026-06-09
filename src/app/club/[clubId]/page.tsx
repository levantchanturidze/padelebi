import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { getTranslations } from "next-intl/server";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { getOwnedClub } from "@/lib/club-access";
import {
  updateClubAction,
  createCourtAction,
  updateCourtAction,
  deleteCourtAction,
  updateScheduleAction,
  createBlackoutAction,
  deleteBlackoutAction,
} from "@/app/actions/club";
import {
  AMENITIES,
  AMENITY_LABELS,
  SURFACES,
  SURFACE_LABELS,
  WEEKDAY_LABELS,
  type Amenity,
} from "@/lib/enums";
import { parseJSON, minutesToTime, formatGEL } from "@/lib/utils";

export default async function ClubManagePage({
  params,
  searchParams,
}: {
  params: Promise<{ clubId: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { clubId } = await params;
  const { saved, error } = await searchParams;
  const user = await requireRole(["CLUB_ADMIN", "PLATFORM_ADMIN"], "/club");
  if (!(await getOwnedClub(clubId, user))) redirect("/club");

  const [club, t] = await Promise.all([
    prisma.club.findUnique({
      where: { id: clubId },
      include: {
        courts: {
          orderBy: { name: "asc" },
          include: {
            schedules: true,
            blackouts: { where: { endTime: { gte: new Date() } }, orderBy: { startTime: "asc" } },
          },
        },
      },
    }),
    getTranslations("club"),
  ]);
  if (!club) notFound();

  const CLUB_NAV = [
    { href: "/club", label: t("overview") },
    { href: "/club/bookings", label: t("bookings") },
  ];

  const amenities = parseJSON<Amenity[]>(club.amenities, []);
  const nowLocal = format(new Date(), "yyyy-MM-dd'T'HH:mm");

  return (
    <DashboardShell title={club.name} subtitle={`${club.city} · ${club.status.toLowerCase()}`} nav={CLUB_NAV} current="/club">
      <div className="mb-4 flex items-center gap-3">
        <Link href="/club" className="text-sm text-muted hover:text-foreground">{t("back")}</Link>
        {club.status === "APPROVED" && (
          <Link href={`/clubs/${club.slug}`} className="text-sm text-brand-600 hover:underline">{t("viewPublic")}</Link>
        )}
      </div>

      {saved && (
        <p className="mb-4 rounded-[var(--radius-md)] bg-brand-50 px-4 py-3 text-sm text-brand-700">{t("saved")}</p>
      )}
      {error && (
        <p className="mb-4 rounded-[var(--radius-md)] bg-red-50 px-4 py-3 text-sm text-danger">{t("saveError")}</p>
      )}

      {/* Profile */}
      <Card>
        <CardContent>
          <h2 className="font-semibold">{t("clubProfile")}</h2>
          <form action={updateClubAction} className="mt-4 grid max-w-2xl gap-4 sm:grid-cols-2">
            <input type="hidden" name="clubId" value={club.id} />
            <div className="sm:col-span-2">
              <Label htmlFor="name">{t("name")}</Label>
              <Input id="name" name="name" defaultValue={club.name} required />
            </div>
            <div>
              <Label htmlFor="city">{t("city")}</Label>
              <Input id="city" name="city" defaultValue={club.city} required />
            </div>
            <div>
              <Label htmlFor="address">{t("address")}</Label>
              <Input id="address" name="address" defaultValue={club.address} required />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="description">{t("description")}</Label>
              <Textarea id="description" name="description" defaultValue={club.description} />
            </div>
            <div className="sm:col-span-2">
              <Label>Amenities</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {AMENITIES.map((a) => (
                  <label key={a} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name={`amenity_${a}`} defaultChecked={amenities.includes(a)} className="h-4 w-4 accent-[var(--color-brand-500)]" />
                    {AMENITY_LABELS[a]}
                  </label>
                ))}
              </div>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit">{t("saveProfile")}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Courts */}
      <h2 className="mt-8 font-semibold">{t("courtsHeading")}</h2>
      <div className="mt-3 space-y-4">
        {club.courts.map((court) => {
          const openDays = new Set(court.schedules.map((s) => s.dayOfWeek));
          const sample = court.schedules[0];
          return (
            <Card key={court.id}>
              <CardContent className="space-y-5">
                <form action={updateCourtAction} className="grid gap-3 sm:grid-cols-2">
                  <input type="hidden" name="courtId" value={court.id} />
                  <div>
                    <Label>{t("courtName")}</Label>
                    <Input name="name" defaultValue={court.name} required />
                  </div>
                  <div>
                    <Label>{t("surface")}</Label>
                    <Select name="surface" defaultValue={court.surface}>
                      {SURFACES.map((s) => <option key={s} value={s}>{SURFACE_LABELS[s]}</option>)}
                    </Select>
                  </div>
                  <div>
                    <Label>{t("pricePerHour")}</Label>
                    <Input name="pricePerHourGEL" type="number" min={0} defaultValue={court.pricePerHourGEL} required />
                  </div>
                  <div className="flex items-end gap-6">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="isIndoor" defaultChecked={court.isIndoor} className="h-4 w-4 accent-[var(--color-brand-500)]" />
                      {t("indoorLabel")}
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="isActive" defaultChecked={court.isActive} className="h-4 w-4 accent-[var(--color-brand-500)]" />
                      {t("activeLabel")}
                    </label>
                  </div>
                  <div className="sm:col-span-2">
                    <Button type="submit" size="sm">{t("saveCourt")}</Button>
                  </div>
                </form>

                {/* Schedule */}
                <div className="rounded-[var(--radius-md)] border border-border bg-background p-4">
                  <h3 className="text-sm font-semibold">{t("schedule")}</h3>
                  <form action={updateScheduleAction} className="mt-3 space-y-3">
                    <input type="hidden" name="courtId" value={court.id} />
                    <div className="flex flex-wrap gap-4">
                      <div>
                        <Label>{t("opens")}</Label>
                        <Input name="open" type="time" defaultValue={minutesToTime(sample?.openMinutes ?? 480)} className="w-32" />
                      </div>
                      <div>
                        <Label>{t("closes")}</Label>
                        <Input name="close" type="time" defaultValue={minutesToTime(sample?.closeMinutes ?? 1320)} className="w-32" />
                      </div>
                      <div>
                        <Label>{t("slotLength")}</Label>
                        <Select name="slotMinutes" defaultValue={String(sample?.slotMinutes ?? 90)} className="w-32">
                          <option value="60">{t("min60")}</option>
                          <option value="90">{t("min90")}</option>
                          <option value="120">{t("min120")}</option>
                        </Select>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {WEEKDAY_LABELS.map((label, d) => (
                        <label key={d} className="flex items-center gap-1.5 text-sm">
                          <input type="checkbox" name={`day_${d}`} defaultChecked={openDays.size ? openDays.has(d) : true} className="h-4 w-4 accent-[var(--color-brand-500)]" />
                          {label.slice(0, 3)}
                        </label>
                      ))}
                    </div>
                    <Button type="submit" size="sm" variant="outline">{t("saveSchedule")}</Button>
                  </form>
                </div>

                {/* Blackouts */}
                <div className="rounded-[var(--radius-md)] border border-border bg-background p-4">
                  <h3 className="text-sm font-semibold">{t("blackouts")}</h3>
                  {court.blackouts.length > 0 && (
                    <ul className="mt-2 space-y-1 text-sm">
                      {court.blackouts.map((bl) => (
                        <li key={bl.id} className="flex items-center justify-between">
                          <span>
                            {format(bl.startTime, "d MMM HH:mm")}–{format(bl.endTime, "HH:mm")}
                            {bl.reason ? ` · ${bl.reason}` : ""}
                          </span>
                          <form action={deleteBlackoutAction}>
                            <input type="hidden" name="blackoutId" value={bl.id} />
                            <button className="text-danger hover:underline" type="submit">{t("remove")}</button>
                          </form>
                        </li>
                      ))}
                    </ul>
                  )}
                  <form action={createBlackoutAction} className="mt-3 flex flex-wrap items-end gap-3">
                    <input type="hidden" name="courtId" value={court.id} />
                    <div>
                      <Label>{t("start")}</Label>
                      <Input name="start" type="datetime-local" defaultValue={nowLocal} />
                    </div>
                    <div>
                      <Label>{t("end")}</Label>
                      <Input name="end" type="datetime-local" defaultValue={nowLocal} />
                    </div>
                    <div>
                      <Label>{t("reason")}</Label>
                      <Input name="reason" placeholder={t("maintenance")} />
                    </div>
                    <Button type="submit" size="sm" variant="outline">{t("addBlackout")}</Button>
                  </form>
                </div>

                <div className="flex items-center justify-between border-t border-border pt-3">
                  <span className="text-sm text-muted">
                    {court.isActive ? t("activeLabel") : "Inactive"} · {formatGEL(court.pricePerHourGEL)}/hr
                    {court.isIndoor ? ` · ${t("indoorLabel")}` : ""}
                  </span>
                  <form action={deleteCourtAction}>
                    <input type="hidden" name="courtId" value={court.id} />
                    <Button type="submit" size="sm" variant="danger">{t("deleteCourt")}</Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add court */}
      <h2 className="mt-8 font-semibold">{t("addCourt")}</h2>
      <Card className="mt-3">
        <CardContent>
          <form action={createCourtAction} className="grid max-w-xl gap-3 sm:grid-cols-2">
            <input type="hidden" name="clubId" value={club.id} />
            <div>
              <Label>{t("courtName")}</Label>
              <Input name="name" placeholder={t("courtPlaceholder")} required />
            </div>
            <div>
              <Label>{t("surface")}</Label>
              <Select name="surface" defaultValue="ARTIFICIAL_GRASS">
                {SURFACES.map((s) => <option key={s} value={s}>{SURFACE_LABELS[s]}</option>)}
              </Select>
            </div>
            <div>
              <Label>{t("pricePerHour")}</Label>
              <Input name="pricePerHourGEL" type="number" min={0} defaultValue={50} required />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="isIndoor" className="h-4 w-4 accent-[var(--color-brand-500)]" />
                {t("indoorLabel")}
              </label>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit">{t("addCourtBtn")}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
