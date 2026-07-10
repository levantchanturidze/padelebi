-- DiscountCode table + Booking snapshot fields.
CREATE TABLE "DiscountCode" (
    "id"           TEXT        NOT NULL,
    "code"         TEXT        NOT NULL,
    "type"         TEXT        NOT NULL,
    "value"        INTEGER     NOT NULL,
    "maxUses"      INTEGER,
    "usedCount"    INTEGER     NOT NULL DEFAULT 0,
    "perUserMax"   INTEGER              DEFAULT 1,
    "minAmountGEL" INTEGER,
    "expiresAt"    TIMESTAMP(3),
    "isActive"     BOOLEAN     NOT NULL DEFAULT true,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscountCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DiscountCode_code_key" ON "DiscountCode"("code");
CREATE INDEX "DiscountCode_isActive_expiresAt_idx" ON "DiscountCode"("isActive", "expiresAt");

ALTER TABLE "Booking" ADD COLUMN "discountCodeId"    TEXT;
ALTER TABLE "Booking" ADD COLUMN "discountAmountGEL" INTEGER;

CREATE INDEX "Booking_discountCodeId_idx" ON "Booking"("discountCodeId");

ALTER TABLE "Booking"
  ADD CONSTRAINT "Booking_discountCodeId_fkey"
  FOREIGN KEY ("discountCodeId") REFERENCES "DiscountCode"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
