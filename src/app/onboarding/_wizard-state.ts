import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

/**
 * Server-side wizard state. Called by every onboarding page to decide
 * whether the user should be there. Sends them to the next uncompleted
 * step so a partially-done wizard is fully resumable across sessions.
 *
 * Order: venue → facility → photos → done. Completion is gated by
 * User.onboardingCompletedAt so a manager who skipped photos won't get
 * pulled back into the wizard on their next visit.
 *
 * PLATFORM_ADMIN gets the same wizard so admins can smoke-test the flow.
 */
export type WizardState = {
  userId: string;
  role: "CLUB_ADMIN" | "PLATFORM_ADMIN";
  venue: {
    id: string;
    name: string;
    hasFacilities: boolean;
    firstFacilityId: string | null;
  } | null;
  onboardingCompletedAt: Date | null;
  nextStep: "venue" | "facility" | "photos" | "done";
};

export async function loadWizardState(callbackUrl: string): Promise<WizardState> {
  const user = await requireRole(["CLUB_ADMIN", "PLATFORM_ADMIN"], callbackUrl);

  const [userRow, venue] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: { onboardingCompletedAt: true },
    }),
    prisma.venue.findFirst({
      where: { ownerId: user.id },
      orderBy: { createdAt: "asc" },
      include: {
        facilities: {
          orderBy: { createdAt: "asc" },
          take: 1,
          select: { id: true },
        },
      },
    }),
  ]);

  const onboardingCompletedAt = userRow?.onboardingCompletedAt ?? null;

  if (!venue) {
    return {
      userId: user.id,
      role: user.role as WizardState["role"],
      venue: null,
      onboardingCompletedAt,
      nextStep: "venue",
    };
  }

  const firstFacility = venue.facilities[0] ?? null;
  const hasFacilities = firstFacility !== null;

  let nextStep: WizardState["nextStep"];
  if (!hasFacilities) nextStep = "facility";
  else if (!onboardingCompletedAt) nextStep = "photos";
  else nextStep = "done";

  return {
    userId: user.id,
    role: user.role as WizardState["role"],
    venue: {
      id: venue.id,
      name: venue.name,
      hasFacilities,
      firstFacilityId: firstFacility?.id ?? null,
    },
    onboardingCompletedAt,
    nextStep,
  };
}

/**
 * Enforce that the current page matches the wizard's expected step —
 * otherwise send the user where they should be.
 */
export function requireStep(
  state: WizardState,
  expected: "venue" | "facility" | "photos" | "done",
): void {
  if (state.nextStep === expected) return;
  redirect(`/onboarding/${state.nextStep}`);
}
