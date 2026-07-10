import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

/**
 * Server-side wizard state. Called by every onboarding page to decide
 * whether the user should be there. Sends them to the next uncompleted
 * step so a partially-done wizard is fully resumable across sessions.
 *
 * PLATFORM_ADMIN gets the same wizard so admins can smoke-test the flow.
 */
export type WizardState = {
  userId: string;
  role: "CLUB_ADMIN" | "PLATFORM_ADMIN";
  venue: { id: string; name: string; hasFacilities: boolean } | null;
  nextStep: "venue" | "facility" | "done";
};

export async function loadWizardState(callbackUrl: string): Promise<WizardState> {
  const user = await requireRole(["CLUB_ADMIN", "PLATFORM_ADMIN"], callbackUrl);

  // Wizard tracks the user's OWN venues only — admins onboarding as-admin
  // still walk through the flow against their own record, not others'.
  const venue = await prisma.venue.findFirst({
    where: { ownerId: user.id },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { facilities: true } } },
  });

  if (!venue) {
    return { userId: user.id, role: user.role as WizardState["role"], venue: null, nextStep: "venue" };
  }

  const hasFacilities = venue._count.facilities > 0;
  return {
    userId: user.id,
    role: user.role as WizardState["role"],
    venue: { id: venue.id, name: venue.name, hasFacilities },
    nextStep: hasFacilities ? "done" : "facility",
  };
}

/**
 * Enforce that the current page matches the wizard's expected step —
 * otherwise send the user where they should be.
 */
export function requireStep(state: WizardState, expected: "venue" | "facility" | "done"): void {
  if (state.nextStep === expected) return;
  redirect(`/onboarding/${state.nextStep}`);
}
