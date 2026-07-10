import Link from "next/link";
import { Building2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { OnboardingStepper } from "../_stepper";
import { loadWizardState, requireStep } from "../_wizard-state";
import { createOnboardingVenueAction } from "@/app/actions/onboarding";

export default async function OnboardingVenuePage() {
  const state = await loadWizardState("/onboarding/venue");
  requireStep(state, "venue");

  const t = await getTranslations("onboarding");

  return (
    <>
      <OnboardingStepper
        current="venue"
        labels={{
          venue: t("stepVenue"),
          facility: t("stepFacility"),
          photos: t("stepPhotos"),
          done: t("stepDone"),
        }}
      />

      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-700">
          <Building2 className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{t("venueTitle")}</h1>
        <p className="mt-1 text-sm text-muted">{t("venueSubtitle")}</p>
      </div>

      <Card>
        <CardContent>
          <form action={createOnboardingVenueAction} className="space-y-4">
            <div>
              <Label htmlFor="name">{t("venueName")}</Label>
              <Input id="name" name="name" required minLength={2} placeholder={t("venueNamePh")} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="city">{t("city")}</Label>
                <Input id="city" name="city" required minLength={2} placeholder={t("cityPh")} />
              </div>
              <div>
                <Label htmlFor="address">{t("address")}</Label>
                <Input id="address" name="address" required minLength={4} placeholder={t("addressPh")} />
              </div>
            </div>

            <div>
              <Label htmlFor="description">{t("description")}</Label>
              <Textarea
                id="description"
                name="description"
                rows={3}
                maxLength={2000}
                placeholder={t("descriptionPh")}
              />
              <p className="mt-1 text-[11px] text-muted">{t("descriptionHelp")}</p>
            </div>

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
