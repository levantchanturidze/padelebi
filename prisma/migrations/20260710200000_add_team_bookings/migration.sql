-- Team booking fields + TeamMember table.
ALTER TABLE "Booking" ADD COLUMN "isTeam"        BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Booking" ADD COLUMN "teamSize"      INTEGER;
ALTER TABLE "Booking" ADD COLUMN "teamShareCode" TEXT;

CREATE UNIQUE INDEX "Booking_teamShareCode_key" ON "Booking"("teamShareCode");

CREATE TABLE "TeamMember" (
    "id"          TEXT         NOT NULL,
    "bookingId"   TEXT         NOT NULL,
    "userId"      TEXT,
    "email"       TEXT,
    "status"      TEXT         NOT NULL DEFAULT 'INVITED',
    "respondedAt" TIMESTAMP(3),
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TeamMember_bookingId_userId_key" ON "TeamMember"("bookingId", "userId");
CREATE UNIQUE INDEX "TeamMember_bookingId_email_key"  ON "TeamMember"("bookingId", "email");
CREATE INDEX        "TeamMember_bookingId_idx"        ON "TeamMember"("bookingId");
CREATE INDEX        "TeamMember_userId_idx"           ON "TeamMember"("userId");

ALTER TABLE "TeamMember"
  ADD CONSTRAINT "TeamMember_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "Booking"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TeamMember"
  ADD CONSTRAINT "TeamMember_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
