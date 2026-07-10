import Link from "next/link";
import { Trophy } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { prisma } from "@/lib/prisma";
import { tSportName } from "@/lib/sports";
import { OnboardingStepper } from "../_stepper";
import { loadWizardState, requireStep } from "../_wizard-state";
import { createOnboardingFacilityAction } from "@/app/actions/onboarding";

export default async function OnboardingFacilityPage() {
  const state = await loadWizardState("/onboarding/facility");
  requireStep(state, "facility");

  const [t, tRoot, sports] = await Promise.all([
    getTranslations("onboarding"),
    getTranslations(),
    prisma.sport.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  // Padel default matches the /manager flow's convention.
  const defaultSport = sports.find((s) => s.slug === "padel") ?? sports[0];

  return (
    <>
      <OnboardingStepper
        current="facility"
        labels={{
          venue: t("stepVenue"),
          facility: t("stepFacility"),
          photos: t("stepPhotos"),
          done: t("stepDone"),
        }}
      />

      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-700">
          <Trophy className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{t("facilityTitle")}</h1>
        <p className="mt-1 text-sm text-muted">
          {t("facilitySubtitle", { venue: state.venue?.name ?? "" })}
        </p>
      </div>

      <Card>
        <CardContent>
          <form action={createOnboardingFacilityAction} className="space-y-4">
            <div>
              <Label htmlFor="name">{t("facilityName")}</Label>
              <Input id="name" name="name" required minLength={1} placeholder={t("facilityNamePh")} />
              <p className="mt-1 text-[11px] text-muted">{t("facilityNameHelp")}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="sportId">{t("sport")}</Label>
                <Select id="sportId" name="sportId" defaultValue={defaultSport?.id} required>
                  {sports.map((s) => (
                    <option key={s.id} value={s.id}>
                      {tSportName(tRoot, s.slug, s.name)}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="pricePerHourGEL">{t("pricePerHour")}</Label>
                <Input
                  id="pricePerHourGEL"
                  name="pricePerHourGEL"
                  type="number"
                  min={0}
                  max={100000}
                  required
                  defaultValue={40}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="isIndoor"
                className="h-4 w-4 rounded border-border text-brand-600 focus:ring-brand-400"
              />
              {t("isIndoor")}
            </label>

            <p className="rounded-[var(--radius-md)] bg-background px-3 py-2 text-xs text-muted">
              {t("defaultsNote")}
            </p>

            <div className="flex items-center justify-between pt-2">
              <Link href="/manager" className="text-sm text-muted hover:text-foreground underline">
                {t("skipForNow")}
              </Link>
              <Button type="submit">{t("continue")}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
