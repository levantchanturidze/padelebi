-- Add District filter to Venue + cross-sport Surface filter to Facility.

ALTER TABLE "Club"  ADD COLUMN "district"        TEXT;
ALTER TABLE "Court" ADD COLUMN "surfaceCategory" TEXT;

-- Filter speed indexes.
CREATE INDEX "Club_city_district_idx"        ON "Club"("city", "district");
CREATE INDEX "Court_surfaceCategory_idx"     ON "Court"("surfaceCategory");
