import { CheckCircle2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { OnboardingStepper } from "../_stepper";
import { loadWizardState, requireStep } from "../_wizard-state";

export default async function OnboardingDonePage() {
  const state = await loadWizardState("/onboarding/done");
  requireStep(state, "done");

  const t = await getTranslations("onboarding");
  const isPending = true; // Venue is created as PENDING and needs admin approval.

  return (
    <>
      <OnboardingStepper
        current="done"
        labels={{ venue: t("stepVenue"), facility: t("stepFacility"), done: t("stepDone") }}
      />

      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-b from-emerald-400 to-success shadow-[0_4px_20px_-4px_rgba(0,184,107,0.55)]">
          <CheckCircle2 className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{t("doneTitle")}</h1>
        <p className="mt-1 text-sm text-muted">
          {isPending ? t("donePendingReview") : t("doneSubtitle")}
        </p>
      </div>

      <Card>
        <CardContent className="space-y-3">
          <h2 className="text-sm font-semibold text-muted">{t("nextStepsTitle")}</h2>
          <ul className="space-y-2 text-sm text-foreground">
            <li className="flex gap-2">
              <span className="text-brand-700">•</span>
              {t("nextAddPhotos")}
            </li>
            <li className="flex gap-2">
              <span className="text-brand-700">•</span>
              {t("nextTuneSchedule")}
            </li>
            <li className="flex gap-2">
              <span className="text-brand-700">•</span>
              {t("nextAddFacilities")}
            </li>
            <li className="flex gap-2">
              <span className="text-brand-700">•</span>
              {t("nextShareLink")}
            </li>
          </ul>

          <div className="pt-2 space-y-2">
            <LinkButton
              href={state.venue ? `/manager/${state.venue.id}?tab=profile` : "/manager"}
              size="lg"
              className="w-full"
            >
              {t("openDashboard")}
            </LinkButton>
            <LinkButton href="/manager" variant="outline" size="lg" className="w-full">
              {t("goToOverview")}
            </LinkButton>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
