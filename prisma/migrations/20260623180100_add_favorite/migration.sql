-- Phase 2 migration: per-user venue favorites.
CREATE TABLE "Favorite" (
    "id"        TEXT PRIMARY KEY,
    "userId"    TEXT NOT NULL,
    "venueId"   TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_userId_fkey"  FOREIGN KEY ("userId")  REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Favorite_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Favorite_userId_venueId_key" ON "Favorite"("userId", "venueId");
CREATE INDEX "Favorite_userId_idx" ON "Favorite"("userId");
