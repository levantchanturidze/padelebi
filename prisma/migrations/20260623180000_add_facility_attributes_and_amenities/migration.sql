-- Phase 2 migration: introduce Facility.attributes JSON for per-sport metadata
-- and align Venue.amenities with the sport-neutral amenity catalog.
--
-- Note: Facility.surface is intentionally KEPT for now. The padel adapter still
-- reads from it; new sports write to attributes.surface. The column is dropped
-- in Phase 3 after a deploy window proves nothing else references it.

-- 1. Facility.attributes ----------------------------------------------------
ALTER TABLE "Court" ADD COLUMN "attributes" TEXT NOT NULL DEFAULT '{}';

-- Backfill: for padel facilities, mirror surface into attributes so the new
-- adapter reads from a single source going forward.
UPDATE "Court"
SET "attributes" = json_build_object('surface', "surface")::text
WHERE "sportId" = 'sport_padel';

-- 2. Amenity catalog migration ---------------------------------------------
-- RACKET_RENTAL was a padel/tennis-specific amenity living in the global list.
-- It is replaced by the sport-neutral BALL_RENTAL. The string is a JSON array
-- inside a TEXT column, so we use a textual substitution.
UPDATE "Club"
SET "amenities" = REPLACE("amenities", '"RACKET_RENTAL"', '"BALL_RENTAL"')
WHERE "amenities" LIKE '%RACKET_RENTAL%';
