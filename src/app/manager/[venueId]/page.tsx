import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { getTranslations } from "next-intl/server";
import { PhotoUploader } from "@/components/photo-uploader";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { AttributesForm } from "@/components/facility/attributes-form";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { getOwnedVenue } from "@/lib/venue-access";
import {
  updateVenueAction,
  createFacilityAction,
  updateFacilityAction,
  deleteFacilityAction,
  updateScheduleAction,
  createBlackoutAction,
  deleteBlackoutAction,
} from "@/app/actions/venue";
import { createClassSessionAction, cancelClassSessionAction } from "@/app/actions/class-session";
import {
  AMENITIES,
  AMENITY_LABELS,
  WEEKDAY_LABELS,
  SURFACE_CATEGORIES,
  type Amenity,
} from "@/lib/enums";
import { parseJSON, minutesToTime, formatGEL } from "@/lib/utils";
import { getAdapter, parseAttributes, tSportName } from "@/lib/sports";

const BOOKING_MODEL_KEYS = ["TIME_SLOT", "CLASS", "DROP_IN"] as const;

export default async function VenueManagePage({
  params,
  searchParams,
}: {
  params: Promise<{ venueId: string }>;
  searchParams: Promise<{ saved?: string; error?: string; tab?: string }>;
}) {
  const { venueId } = await params;
  const { saved, error, tab = "profile" } = await searchParams;
  const user = await requireRole(["CLUB_ADMIN", "PLATFORM_ADMIN"], "/manager");
  if (!(await getOwnedVenue(venueId, user))) redirect("/manager");

  const [venue, sports, t, tRoot] = await Promise.all([
    prisma.venue.findUnique({
      where: { id: venueId },
      include: {
        facilities: {
          orderBy: { name: "asc" },
          include: {
            sport: true,
            schedules: true,
            blackouts: { where: { endTime: { gte: new Date() } }, orderBy: { startTime: "asc" } },
            classes: {
              where: { isCancelled: false, endTime: { gte: new Date() } },
              orderBy: { startTime: "asc" },
              include: { _count: { select: { bookings: { where: { status: { not: "CANCELLED" } } } } } },
            },
          },
        },
      },
    }),
    prisma.sport.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    getTranslations("club"),
    getTranslations(),
  ]);
  if (!venue) notFound();

  const tp = await getTranslations("photos");

  const MANAGER_NAV = [
    { href: "/manager", label: t("overview") },
    { href: "/manager/bookings", label: t("bookings") },
  ];

  const amenities = parseJSON<Amenity[]>(venue.amenities, []);
  const venuePhotos = parseJSON<string[]>(venue.photos, []);
  const nowLocal = format(new Date(), "yyyy-MM-dd'T'HH:mm");

  const tabs = [
    { key: "profile", label: t("profileTab") },
    { key: "facilities", label: t("courtsTab") },
  ];
  const activeTab = tab === "courts" ? "facilities" : tab;

  const defaultSport = sports.find((s) => s.slug === "padel") ?? sports[0];
  const defaultAdapter = getAdapter(defaultSport?.slug);

  return (
    <DashboardShell title={venue.name} subtitle={`${venue.city} · ${venue.status.toLowerCase()}`} nav={MANAGER_NAV} current="/manager">
      <div className="mb-5 flex items-center gap-3">
        <Link href="/manager" className="text-sm text-muted hover:text-foreground">{t("back")}</Link>
        {venue.status === "APPROVED" && (
          <Link href={`/venues/${venue.slug}`} className="text-sm text-brand-600 hover:underline">{t("viewPublic")}</Link>
        )}
      </div>

      {saved && (
        <p className="mb-4 rounded-[var(--radius-md)] bg-brand-50 px-4 py-3 text-sm text-brand-700">{t("saved")}</p>
      )}
      {error && (
        <p className="mb-4 rounded-[var(--radius-md)] bg-red-50 px-4 py-3 text-sm text-danger">{t("saveError")}</p>
      )}

      <div className="mb-6 flex border-b border-border">
        {tabs.map(({ key, label }) => (
          <Link
            key={key}
            href={`/manager/${venueId}?tab=${key}`}
            className={[
              "-mb-px border-b-2 px-5 pb-3 pt-1 text-sm font-medium transition-colors",
              activeTab === key
                ? "border-brand-500 text-brand-600"
                : "border-transparent text-muted hover:text-foreground",
            ].join(" ")}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* ── Profile tab ─────────────────────────────────────────── */}
      {activeTab === "profile" && (
        <Card>
          <CardContent>
            <h2 className="font-semibold">{t("clubProfile")}</h2>
            <form action={updateVenueAction} className="mt-4 grid max-w-2xl gap-4 sm:grid-cols-2">
              <input type="hidden" name="venueId" value={venue.id} />
              <div className="sm:col-span-2">
                <Label htmlFor="name">{t("name")}</Label>
                <Input id="name" name="name" defaultValue={venue.name} required />
              </div>
              <div>
                <Label htmlFor="city">{t("city")}</Label>
                <Input id="city" name="city" defaultValue={venue.city} required />
              </div>
              <div>
                <Label htmlFor="address">{t("address")}</Label>
                <Input id="address" name="address" defaultValue={venue.address} required />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="district">{tRoot("filters.district")}</Label>
                <Input
                  id="district"
                  name="district"
                  defaultValue={venue.district ?? ""}
                  placeholder={tRoot("filters.districtPlaceholder")}
                  list="venue-districts"
                />
                <datalist id="venue-districts">
                  {[
                    "საბურთალო", "ვაკე", "დიდუბე", "მარჯანიშვილი", "გლდანი",
                    "ნაძალადევი", "წყნეთი", "ისანი", "ვაზისუბანი",
                  ].map((d) => <option key={d} value={d} />)}
                </datalist>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="description">{t("description")}</Label>
                <Textarea id="description" name="description" defaultValue={venue.description} />
              </div>
              <div className="sm:col-span-2">
                <Label>{t("amenitiesLabel")}</Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {AMENITIES.map((a) => (
                    <label key={a} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name={`amenity_${a}`} defaultChecked={amenities.includes(a)} className="h-4 w-4 accent-[var(--color-brand-500)]" />
                      {tRoot(`clubs.amenityLabels.${a}` as never) ?? AMENITY_LABELS[a]}
                    </label>
                  ))}
                </div>
              </div>
              <div className="sm:col-span-2">
                <Button type="submit">{t("saveProfile")}</Button>
              </div>
            </form>

            <div className="mt-6 border-t border-border pt-5">
              <p className="mb-3 text-sm font-medium">{tp("clubPhotos")}</p>
              <PhotoUploader kind="venue" entityId={venue.id} initial={venuePhotos} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Facilities tab ──────────────────────────────────────── */}
      {activeTab === "facilities" && (
        <>
          {venue.facilities.length === 0 && (
            <p className="mb-4 text-sm text-muted">{t("noClubs")}</p>
          )}

          <div className="space-y-4">
            {venue.facilities.map((facility) => {
              const adapter = getAdapter(facility.sport.slug);
              const attrs = parseAttributes(facility.sport.slug, facility.attributes);
              const openDays = new Set(facility.schedules.map((s) => s.dayOfWeek));
              const sample = facility.schedules[0];
              const isTimeSlot = facility.bookingModel === "TIME_SLOT";
              const isClass = facility.bookingModel === "CLASS";
              const isDropIn = facility.bookingModel === "DROP_IN";

              return (
                <Card key={facility.id}>
                  <CardContent className="space-y-5">
                    {/* Facility details */}
                    <form action={updateFacilityAction} className="grid gap-3 sm:grid-cols-2">
                      <input type="hidden" name="facilityId" value={facility.id} />
                      <div>
                        <Label>{t("courtName")}</Label>
                        <Input name="name" defaultValue={facility.name} required />
                      </div>
                      <div>
                        <Label>{tRoot("manager.sport")}</Label>
                        <Select name="sportId" defaultValue={facility.sportId}>
                          {sports.map((s) => <option key={s.id} value={s.id}>{tSportName(tRoot, s.slug)}</option>)}
                        </Select>
                      </div>
                      <div>
                        <Label>{tRoot("manager.bookingModelLabel")}</Label>
                        <Select name="bookingModel" defaultValue={facility.bookingModel}>
                          {BOOKING_MODEL_KEYS.map((k) => (
                            <option key={k} value={k}>{tRoot(`bookingModels.${k}` as never)}</option>
                          ))}
                        </Select>
                      </div>
                      <div>
                        <Label>{tRoot("manager.capacity")}</Label>
                        <Input name="capacity" type="number" min={1} max={10000} defaultValue={facility.capacity} required />
                      </div>
                      <div>
                        <Label>{isDropIn ? tRoot("manager.dayPassPrice") : isClass ? tRoot("manager.defaultClassPrice") : t("pricePerHour")}</Label>
                        <Input name="pricePerHourGEL" type="number" min={0} defaultValue={facility.pricePerHourGEL} required />
                      </div>
                      <div>
                        <Label>{tRoot("filters.surface")}</Label>
                        <Select name="surfaceCategory" defaultValue={facility.surfaceCategory ?? ""}>
                          <option value="">{tRoot("filters.anySurface")}</option>
                          {SURFACE_CATEGORIES.map((s) => (
                            <option key={s} value={s}>{tRoot(`filters.surfaceOpts.${s}` as never)}</option>
                          ))}
                        </Select>
                      </div>
                      <div className="flex items-end gap-6">
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" name="isIndoor" defaultChecked={facility.isIndoor} className="h-4 w-4 accent-[var(--color-brand-500)]" />
                          {t("indoorLabel")}
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" name="isActive" defaultChecked={facility.isActive} className="h-4 w-4 accent-[var(--color-brand-500)]" />
                          {t("activeLabel")}
                        </label>
                      </div>

                      <div className="sm:col-span-2">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                          {tRoot("manager.details", { sport: tSportName(tRoot, facility.sport.slug) })}
                        </p>
                        <AttributesForm fields={adapter.formFields} initial={attrs} />
                      </div>

                      <div className="sm:col-span-2">
                        <Button type="submit" size="sm">{t("saveCourt")}</Button>
                      </div>
                    </form>

                    {/* Schedule — only for TIME_SLOT */}
                    {isTimeSlot && (
                      <div className="rounded-[var(--radius-md)] border border-border bg-background p-4">
                        <h3 className="text-sm font-semibold">{t("schedule")}</h3>
                        <form action={updateScheduleAction} className="mt-3 space-y-3">
                          <input type="hidden" name="facilityId" value={facility.id} />
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
                              <Select name="slotMinutes" defaultValue={String(sample?.slotMinutes ?? adapter.defaults.slotMinutes)} className="w-32">
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
                    )}

                    {/* Class sessions — only for CLASS */}
                    {isClass && (
                      <div className="rounded-[var(--radius-md)] border border-border bg-background p-4">
                        <h3 className="text-sm font-semibold">{tRoot("manager.upcomingClasses")}</h3>
                        {facility.classes.length === 0 ? (
                          <p className="mt-2 text-sm text-muted">{tRoot("manager.noUpcomingSessions")}</p>
                        ) : (
                          <ul className="mt-2 space-y-1.5 text-sm">
                            {facility.classes.map((cs) => (
                              <li key={cs.id} className="flex items-center justify-between gap-2">
                                <span>
                                  <span className="font-medium">{cs.title}</span>{" "}
                                  · {format(cs.startTime, "EEE d MMM, HH:mm")}–{format(cs.endTime, "HH:mm")}
                                  {cs.instructor ? <> · {cs.instructor}</> : null}
                                  {" "}· {tRoot("manager.booked", { taken: cs._count.bookings, capacity: cs.capacity })}
                                  {" "}· {formatGEL(cs.priceGEL)}
                                </span>
                                <form action={cancelClassSessionAction}>
                                  <input type="hidden" name="sessionId" value={cs.id} />
                                  <button className="text-danger hover:underline" type="submit">{tRoot("manager.cancelSession")}</button>
                                </form>
                              </li>
                            ))}
                          </ul>
                        )}

                        <form action={createClassSessionAction} className="mt-4 grid gap-3 sm:grid-cols-2">
                          <input type="hidden" name="facilityId" value={facility.id} />
                          <div className="sm:col-span-2">
                            <Label>{tRoot("manager.sessionTitle")}</Label>
                            <Input name="title" placeholder={tRoot("manager.sessionTitlePlaceholder")} required />
                          </div>
                          <div>
                            <Label>{tRoot("manager.sessionStart")}</Label>
                            <Input name="startTime" type="datetime-local" defaultValue={nowLocal} required />
                          </div>
                          <div>
                            <Label>{tRoot("manager.sessionEnd")}</Label>
                            <Input name="endTime" type="datetime-local" defaultValue={nowLocal} required />
                          </div>
                          <div>
                            <Label>{tRoot("manager.sessionCapacity")}</Label>
                            <Input name="capacity" type="number" min={1} max={500} defaultValue={facility.capacity} required />
                          </div>
                          <div>
                            <Label>{tRoot("manager.pricePerSeat")}</Label>
                            <Input name="priceGEL" type="number" min={0} defaultValue={facility.pricePerHourGEL} required />
                          </div>
                          <div className="sm:col-span-2">
                            <Label>{tRoot("manager.instructor")}</Label>
                            <Input name="instructor" placeholder={tRoot("manager.instructorPlaceholder")} />
                          </div>
                          <div className="sm:col-span-2">
                            <Button type="submit" size="sm" variant="outline">{tRoot("manager.addSession")}</Button>
                          </div>
                        </form>
                      </div>
                    )}

                    {/* Drop-in info — only for DROP_IN */}
                    {isDropIn && (
                      <div className="rounded-[var(--radius-md)] border border-border bg-background p-4 text-sm text-muted">
                        {tRoot("manager.dropInExplainer")}
                      </div>
                    )}

                    {/* Blackouts — only for TIME_SLOT (CLASS uses cancel-session; DROP_IN doesn't need it) */}
                    {isTimeSlot && (
                      <div className="rounded-[var(--radius-md)] border border-border bg-background p-4">
                        <h3 className="text-sm font-semibold">{t("blackouts")}</h3>
                        {facility.blackouts.length > 0 && (
                          <ul className="mt-2 space-y-1 text-sm">
                            {facility.blackouts.map((bl) => (
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
                          <input type="hidden" name="facilityId" value={facility.id} />
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
                    )}

                    {/* Facility photos */}
                    <div className="rounded-[var(--radius-md)] border border-border bg-background p-4">
                      <h3 className="mb-3 text-sm font-semibold">{tp("courtPhotos")}</h3>
                      <PhotoUploader kind="facility" entityId={facility.id} initial={parseJSON<string[]>(facility.photos, [])} />
                    </div>

                    {/* Delete */}
                    <div className="flex items-center justify-between border-t border-border pt-3">
                      <span className="text-sm text-muted">
                        {facility.isActive ? t("activeLabel") : tRoot("manager.inactive")} · {tRoot(`bookingModels.${facility.bookingModel}` as never)} · {formatGEL(facility.pricePerHourGEL)}
                      </span>
                      <form action={deleteFacilityAction}>
                        <input type="hidden" name="facilityId" value={facility.id} />
                        <Button type="submit" size="sm" variant="danger">{t("deleteCourt")}</Button>
                      </form>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Add facility */}
          <h2 className="mt-8 font-semibold">{t("addCourt")}</h2>
          <Card className="mt-3">
            <CardContent>
              <form action={createFacilityAction} className="grid max-w-xl gap-3 sm:grid-cols-2">
                <input type="hidden" name="venueId" value={venue.id} />
                <div>
                  <Label>{t("courtName")}</Label>
                  <Input name="name" placeholder={t("courtPlaceholder")} required />
                </div>
                <div>
                  <Label>{tRoot("manager.sport")}</Label>
                  <Select name="sportId" defaultValue={defaultSport?.id}>
                    {sports.map((s) => <option key={s.id} value={s.id}>{tSportName(tRoot, s.slug)}</option>)}
                  </Select>
                </div>
                <div>
                  <Label>{tRoot("manager.bookingModelLabel")}</Label>
                  <Select name="bookingModel" defaultValue={defaultAdapter.defaults.bookingModel}>
                    {BOOKING_MODEL_KEYS.map((k) => (
                      <option key={k} value={k}>{tRoot(`bookingModels.${k}` as never)}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>{tRoot("manager.capacity")}</Label>
                  <Input name="capacity" type="number" min={1} defaultValue={defaultAdapter.defaults.capacity} required />
                </div>
                <div>
                  <Label>{t("pricePerHour")}</Label>
                  <Input name="pricePerHourGEL" type="number" min={0} defaultValue={defaultAdapter.defaults.pricePerHourGEL} required />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="isIndoor" className="h-4 w-4 accent-[var(--color-brand-500)]" />
                    {t("indoorLabel")}
                  </label>
                </div>

                <div className="sm:col-span-2">
                  <AttributesForm
                    fields={defaultAdapter.formFields}
                    initial={defaultAdapter.defaults.attributes}
                  />
                </div>

                <div className="sm:col-span-2">
                  <Button type="submit">{t("addCourtBtn")}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </>
      )}
    </DashboardShell>
  );
}
