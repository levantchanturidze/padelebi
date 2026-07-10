-- Onboarding completion flag. Null for legacy CLUB_ADMIN rows — they've
-- already got venues and facilities, so we backfill them as complete so
-- the wizard doesn't re-catch them on their next visit.
ALTER TABLE "User" ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3);

UPDATE "User"
   SET "onboardingCompletedAt" = NOW()
 WHERE EXISTS (
   SELECT 1 FROM "Club" WHERE "Club"."ownerId" = "User"."id"
 );
