-- Phase 0 + 1 migration: introduce Sport catalog and link every existing Facility (Court) to padel.
-- The Club / Court / CourtSchedule tables are intentionally NOT renamed; the Prisma client now
-- exposes them as Venue / Facility / FacilitySchedule via @@map, so existing data and queries
-- remain compatible.

-- 1. Sport catalog ----------------------------------------------------------
CREATE TABLE "Sport" (
    "id"        TEXT PRIMARY KEY,
    "slug"      TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "icon"      TEXT NOT NULL,
    "category"  TEXT NOT NULL,
    "isActive"  BOOLEAN NOT NULL DEFAULT TRUE,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "Sport_slug_key" ON "Sport"("slug");
CREATE INDEX "Sport_category_isActive_idx" ON "Sport"("category", "isActive");

-- 2. Seed the initial sport rows (deterministic IDs so backfill below is stable). ------------
INSERT INTO "Sport" ("id", "slug", "name", "icon", "category", "sortOrder") VALUES
    ('sport_padel',         'padel',         'Padel',         'Trophy',       'RACQUET',    10),
    ('sport_tennis',        'tennis',        'Tennis',        'Trophy',       'RACQUET',    20),
    ('sport_football',      'football',      'Football',      'Goal',         'TEAM',       30),
    ('sport_basketball',    'basketball',    'Basketball',    'Dribbble',     'TEAM',       40),
    ('sport_volleyball',    'volleyball',    'Volleyball',    'Volleyball',   'TEAM',       50),
    ('sport_futsal',        'futsal',        'Futsal',        'Goal',         'TEAM',       60),
    ('sport_badminton',     'badminton',     'Badminton',     'Feather',      'RACQUET',    70),
    ('sport_table_tennis',  'table-tennis',  'Table tennis',  'CircleDot',    'RACQUET',    80),
    ('sport_squash',        'squash',        'Squash',        'CircleDot',    'RACQUET',    90),
    ('sport_swimming',      'swimming',      'Swimming pool', 'Waves',        'WATER',     100),
    ('sport_gym',           'gym',           'Gym',           'Dumbbell',     'FITNESS',   110),
    ('sport_fitness_class', 'fitness-class', 'Fitness class', 'HeartPulse',   'FITNESS',   120),
    ('sport_martial_arts',  'martial-arts',  'Martial arts',  'Swords',       'FITNESS',   130);

-- 3. Facility (Court) -> Sport -------------------------------------------------
-- Add column nullable first so we can backfill, then enforce NOT NULL.
ALTER TABLE "Court" ADD COLUMN "sportId" TEXT;
UPDATE "Court" SET "sportId" = 'sport_padel' WHERE "sportId" IS NULL;
ALTER TABLE "Court" ALTER COLUMN "sportId" SET NOT NULL;

ALTER TABLE "Court"
    ADD CONSTRAINT "Court_sportId_fkey"
    FOREIGN KEY ("sportId") REFERENCES "Sport"("id")
    ON DELETE NO ACTION ON UPDATE CASCADE;

CREATE INDEX "Court_sportId_isActive_idx" ON "Court"("sportId", "isActive");
