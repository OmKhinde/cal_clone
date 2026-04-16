ALTER TYPE "SchedulingType" ADD VALUE IF NOT EXISTS 'INDIVIDUAL';

CREATE TYPE "BookingPaymentStatus" AS ENUM ('NOT_REQUIRED', 'REQUIRED', 'PAID');

ALTER TABLE "bookings"
ADD COLUMN "idempotencyKey" TEXT,
ADD COLUMN "paymentStatus" "BookingPaymentStatus" NOT NULL DEFAULT 'NOT_REQUIRED';

CREATE UNIQUE INDEX "bookings_idempotencyKey_key" ON "bookings"("idempotencyKey");
CREATE INDEX "bookings_idempotencyKey_idx" ON "bookings"("idempotencyKey");
