-- Home base (Phase 11): fallback position for the /venues distance sort
-- when the user hasn't granted live browser geolocation.

ALTER TABLE "User" ADD COLUMN "homeAddress" TEXT;
ALTER TABLE "User" ADD COLUMN "homeLat"     DOUBLE PRECISION;
ALTER TABLE "User" ADD COLUMN "homeLng"     DOUBLE PRECISION;
