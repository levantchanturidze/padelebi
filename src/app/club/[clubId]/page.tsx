import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

const CLUB_NAV = [
  { href: "/club", label: "Overview" },
  { href: "/club/bookings", label: "Bookings" },
];

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

  const club = await prisma.club.findUnique({
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
  });
  if (!club) notFound();

  const amenities = parseJSON<Amenity[]>(club.amenities, []);
  const nowLocal = format(new Date(), "yyyy-MM-dd'T'HH:mm");

  return (
    <DashboardShell
      title={club.name}
      subtitle={`${club.city} · ${club.status.toLowerCase()}`}
      nav={CLUB_NAV}
      current="/club"
    >
      <div className="mb-4 flex items-center gap-3">
        <Link href="/club" className="text-sm text-muted hover:text-foreground">
          ← All clubs
        </Link>
        {club.status === "APPROVED" && (
          <Link href={`/clubs/${club.slug}`} className="text-sm text-brand-600 hover:underline">
            View public page
          </Link>
        )}
      </div>

      {saved && (
        <p className="mb-4 rounded-[var(--radius-md)] bg-brand-50 px-4 py-3 text-sm text-brand-700">
          Changes saved.
        </p>
      )}
      {error && (
        <p className="mb-4 rounded-[var(--radius-md)] bg-red-50 px-4 py-3 text-sm text-danger">
          Could not save — please check your input.
        </p>
      )}

      {/* Profile */}
      <Card>
        <CardContent>
          <h2 className="font-semibold">Club profile</h2>
          <form action={updateClubAction} className="mt-4 grid max-w-2xl gap-4 sm:grid-cols-2">
            <input type="hidden" name="clubId" value={club.id} />
            <div className="sm:col-span-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={club.name} required />
            </div>
            <div>
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" defaultValue={club.city} required />
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Input id="address" name="address" defaultValue={club.address} required />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" defaultValue={club.description} />
            </div>
            <div className="sm:col-span-2">
              <Label>Amenities</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {AMENITIES.map((a) => (
                  <label key={a} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name={`amenity_${a}`}
                      defaultChecked={amenities.includes(a)}
                      className="h-4 w-4 accent-[var(--color-brand-500)]"
                    />
                    {AMENITY_LABELS[a]}
                  </label>
                ))}
              </div>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit">Save profile</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Courts */}
      <h2 className="mt-8 font-semibold">Courts</h2>
      <div className="mt-3 space-y-4">
        {club.courts.map((court) => {
          const openDays = new Set(court.schedules.map((s) => s.dayOfWeek));
          const sample = court.schedules[0];
          return (
            <Card key={court.id}>
              <CardContent className="space-y-5">
                {/* Court fields */}
                <form action={updateCourtAction} className="grid gap-3 sm:grid-cols-2">
                  <input type="hidden" name="courtId" value={court.id} />
                  <div>
                    <Label>Court name</Label>
                    <Input name="name" defaultValue={court.name} required />
                  </div>
                  <div>
                    <Label>Surface</Label>
                    <Select name="surface" defaultValue={court.surface}>
                      {SURFACES.map((s) => (
                        <option key={s} value={s}>{SURFACE_LABELS[s]}</option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label>Price per hour (GEL)</Label>
                    <Input
                      name="pricePerHourGEL"
                      type="number"
                      min={0}
                      defaultValue={court.pricePerHourGEL}
                      required
                    />
                  </div>
                  <div className="flex items-end gap-6">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="isIndoor" defaultChecked={court.isIndoor} className="h-4 w-4 accent-[var(--color-brand-500)]" />
                      Indoor
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="isActive" defaultChecked={court.isActive} className="h-4 w-4 accent-[var(--color-brand-500)]" />
                      Active
                    </label>
                  </div>
                  <div className="sm:col-span-2">
                    <Button type="submit" size="sm">Save court</Button>
                  </div>
                </form>

                {/* Schedule */}
                <div className="rounded-[var(--radius-md)] border border-border bg-background p-4">
                  <h3 className="text-sm font-semibold">Weekly schedule</h3>
                  <form action={updateScheduleAction} className="mt-3 space-y-3">
                    <input type="hidden" name="courtId" value={court.id} />
                    <div className="flex flex-wrap gap-4">
                      <div>
                        <Label>Opens</Label>
                        <Input
                          name="open"
                          type="time"
                          defaultValue={minutesToTime(sample?.openMinutes ?? 480)}
                          className="w-32"
                        />
                      </div>
                      <div>
                        <Label>Closes</Label>
                        <Input
                          name="close"
                          type="time"
                          defaultValue={minutesToTime(sample?.closeMinutes ?? 1320)}
                          className="w-32"
                        />
                      </div>
                      <div>
                        <Label>Slot length</Label>
                        <Select name="slotMinutes" defaultValue={String(sample?.slotMinutes ?? 90)} className="w-32">
                          <option value="60">60 min</option>
                          <option value="90">90 min</option>
                          <option value="120">120 min</option>
                        </Select>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {WEEKDAY_LABELS.map((label, d) => (
                        <label key={d} className="flex items-center gap-1.5 text-sm">
                          <input
                            type="checkbox"
                            name={`day_${d}`}
                            defaultChecked={openDays.size ? openDays.has(d) : true}
                            className="h-4 w-4 accent-[var(--color-brand-500)]"
                          />
                          {label.slice(0, 3)}
                        </label>
                      ))}
                    </div>
                    <Button type="submit" size="sm" variant="outline">Save schedule</Button>
                  </form>
                </div>

                {/* Blackouts */}
                <div className="rounded-[var(--radius-md)] border border-border bg-background p-4">
                  <h3 className="text-sm font-semibold">Blackouts (blocked times)</h3>
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
                            <button className="text-danger hover:underline" type="submit">
                              Remove
                            </button>
                          </form>
                        </li>
                      ))}
                    </ul>
                  )}
                  <form action={createBlackoutAction} className="mt-3 flex flex-wrap items-end gap-3">
                    <input type="hidden" name="courtId" value={court.id} />
                    <div>
                      <Label>Start</Label>
                      <Input name="start" type="datetime-local" defaultValue={nowLocal} />
                    </div>
                    <div>
                      <Label>End</Label>
                      <Input name="end" type="datetime-local" defaultValue={nowLocal} />
                    </div>
                    <div>
                      <Label>Reason</Label>
                      <Input name="reason" placeholder="Maintenance" />
                    </div>
                    <Button type="submit" size="sm" variant="outline">Add blackout</Button>
                  </form>
                </div>

                <div className="flex items-center justify-between border-t border-border pt-3">
                  <span className="text-sm text-muted">
                    {court.isActive ? "Active" : "Inactive"} · {formatGEL(court.pricePerHourGEL)}/hr
                    {court.isIndoor ? " · Indoor" : " · Outdoor"}
                  </span>
                  <form action={deleteCourtAction}>
                    <input type="hidden" name="courtId" value={court.id} />
                    <Button type="submit" size="sm" variant="danger">Delete court</Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add court */}
      <h2 className="mt-8 font-semibold">Add a court</h2>
      <Card className="mt-3">
        <CardContent>
          <form action={createCourtAction} className="grid max-w-xl gap-3 sm:grid-cols-2">
            <input type="hidden" name="clubId" value={club.id} />
            <div>
              <Label>Court name</Label>
              <Input name="name" placeholder="Court 1" required />
            </div>
            <div>
              <Label>Surface</Label>
              <Select name="surface" defaultValue="ARTIFICIAL_GRASS">
                {SURFACES.map((s) => (
                  <option key={s} value={s}>{SURFACE_LABELS[s]}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Price per hour (GEL)</Label>
              <Input name="pricePerHourGEL" type="number" min={0} defaultValue={50} required />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="isIndoor" className="h-4 w-4 accent-[var(--color-brand-500)]" />
                Indoor
              </label>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit">Add court</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
