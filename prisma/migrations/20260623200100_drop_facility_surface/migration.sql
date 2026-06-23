-- Phase 3 cleanup: drop the legacy Facility.surface column.
-- All padel facilities now read/write the surface value from `attributes.surface`
-- (backfilled by the Phase 2 migration). No remaining code reads this column.

ALTER TABLE "Court" DROP COLUMN "surface";
