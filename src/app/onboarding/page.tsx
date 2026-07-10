import { redirect } from "next/navigation";
import { loadWizardState } from "./_wizard-state";

/**
 * Onboarding entry — resolves the user's next step and forwards there.
 * Kept as a redirect-only page so /onboarding is a stable link we can
 * point CLUB_ADMIN sign-ups at.
 */
export default async function OnboardingEntryPage() {
  const state = await loadWizardState("/onboarding");
  redirect(`/onboarding/${state.nextStep}`);
}
