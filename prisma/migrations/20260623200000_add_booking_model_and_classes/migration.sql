-- Phase 3 migration: introduce bookingModel + capacity on Facility, ClassSession,
-- and per-booking classSessionId + attendees so a single Booking table can serve
-- TIME_SLOT, CLASS and DROP_IN flows uniformly.

-- 1. Facility booking model + capacity ----------------------------------------
ALTER TABLE "Court" ADD COLUMN "bookingModel" TEXT NOT NULL DEFAULT 'TIME_SLOT';
ALTER TABLE "Court" ADD COLUMN "capacity"     INTEGER NOT NULL DEFAULT 1;

-- 2. ClassSession --------------------------------------------------------------
CREATE TABLE "ClassSession" (
    "id"          TEXT PRIMARY KEY,
    "facilityId"  TEXT NOT NULL,
    "title"       TEXT NOT NULL,
    "startTime"   TIMESTAMP(3) NOT NULL,
    "endTime"     TIMESTAMP(3) NOT NULL,
    "capacity"    INTEGER NOT NULL,
    "priceGEL"    INTEGER NOT NULL,
    "instructor"  TEXT,
    "isCancelled" BOOLEAN NOT NULL DEFAULT FALSE,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassSession_facilityId_fkey"
        FOREIGN KEY ("facilityId") REFERENCES "Court"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ClassSession_facilityId_startTime_idx" ON "ClassSession"("facilityId", "startTime");

-- 3. Booking class linkage + attendees ----------------------------------------
ALTER TABLE "Booking" ADD COLUMN "classSessionId" TEXT;
ALTER TABLE "Booking" ADD COLUMN "attendees"      INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "Booking"
    ADD CONSTRAINT "Booking_classSessionId_fkey"
    FOREIGN KEY ("classSessionId") REFERENCES "ClassSession"("id")
    ON DELETE NO ACTION ON UPDATE CASCADE;

CREATE INDEX "Booking_classSessionId_idx" ON "Booking"("classSessionId");
