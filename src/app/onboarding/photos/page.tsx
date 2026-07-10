import { ImagePlus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PhotoUploader } from "@/components/photo-uploader";
import { prisma } from "@/lib/prisma";
import { parseJSON } from "@/lib/utils";
import { OnboardingStepper } from "../_stepper";
import { loadWizardState, requireStep } from "../_wizard-state";
import { finishOnboardingAction } from "@/app/actions/onboarding";

/**
 * Step 3 — optional. Uploads a cover photo for the venue and one for the
 * first facility. Both "Finish" and "Skip" finalise the wizard so users
 * who don't upload anything can still leave, and the wizard stops
 * showing up on their next visit.
 */
export default async function OnboardingPhotosPage() {
  const state = await loadWizardState("/onboarding/photos");
  requireStep(state, "photos");

  const t = await getTranslations("onboarding");

  // Type-narrowing: requireStep guarantees venue + firstFacilityId are set
  // when nextStep === "photos", but Prisma types don't know that.
  if (!state.venue || !state.venue.firstFacilityId) {
    // Defensive: shouldn't happen because requireStep would have redirected.
    return null;
  }

  const [venue, facility] = await Promise.all([
    prisma.venue.findUnique({ where: { id: state.venue.id }, select: { photos: true } }),
    prisma.facility.findUnique({
      where: { id: state.venue.firstFacilityId },
      select: { photos: true, name: true },
    }),
  ]);

  const venuePhotos = parseJSON<string[]>(venue?.photos ?? "[]", []);
  const facilityPhotos = parseJSON<string[]>(facility?.photos ?? "[]", []);

  return (
    <>
      <OnboardingStepper
        current="photos"
        labels={{
          venue: t("stepVenue"),
          facility: t("stepFacility"),
          photos: t("stepPhotos"),
          done: t("stepDone"),
        }}
      />

      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-700">
          <ImagePlus className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{t("photosTitle")}</h1>
        <p className="mt-1 text-sm text-muted">{t("photosSubtitle")}</p>
      </div>

      <div className="space-y-4">
        <Card>
          <CardContent>
            <h2 className="mb-1 text-sm font-semibold text-foreground">
              {t("photosVenueCover")}
            </h2>
            <p className="mb-3 text-xs text-muted">{t("photosVenueCoverHelp")}</p>
            <PhotoUploader kind="venue" entityId={state.venue.id} initial={venuePhotos} />
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h2 className="mb-1 text-sm font-semibold text-foreground">
              {t("photosFacility", { name: facility?.name ?? "" })}
            </h2>
            <p className="mb-3 text-xs text-muted">{t("photosFacilityHelp")}</p>
            <PhotoUploader
              kind="facility"
              entityId={state.venue.firstFacilityId}
              initial={facilityPhotos}
            />
          </CardContent>
        </Card>

        {/* Finish + Skip both finalise the wizard — Skip is just a visual
            distinction so users who don't upload photos still commit. */}
        <div className="flex items-center justify-between pt-2">
          <form action={finishOnboardingAction}>
            <button
              type="submit"
              className="text-sm text-muted hover:text-foreground underline"
            >
              {t("photosSkip")}
            </button>
          </form>
          <form action={finishOnboardingAction}>
            <Button type="submit">{t("photosFinish")}</Button>
          </form>
        </div>
      </div>
    </>
  );
}
