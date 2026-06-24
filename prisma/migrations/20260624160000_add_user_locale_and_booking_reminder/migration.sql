-- Phase 8: routing emails by language + idempotent 24h reminder cron.

-- User locale (preferred language for transactional emails).
ALTER TABLE "User" ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'ka';

-- Booking reminder timestamp (null = no reminder sent yet).
ALTER TABLE "Booking" ADD COLUMN "reminderSentAt" TIMESTAMP(3);

-- Index helps the cron query find candidates quickly.
CREATE INDEX "Booking_reminderSentAt_startTime_idx"
    ON "Booking" ("reminderSentAt", "startTime");
