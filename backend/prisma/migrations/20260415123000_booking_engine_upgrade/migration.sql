-- Booking lifecycle upgrade
ALTER TYPE "BookingStatus" RENAME VALUE 'CONFIRMED' TO 'ACCEPTED';
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'PENDING';
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'REJECTED';

ALTER TABLE "bookings"
ADD COLUMN IF NOT EXISTS "uid" TEXT,
ADD COLUMN IF NOT EXISTS "fromRescheduleUid" TEXT,
ADD COLUMN IF NOT EXISTS "location" TEXT,
ADD COLUMN IF NOT EXISTS "noShowHost" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "cancellationReason" TEXT,
ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;

UPDATE "bookings"
SET "uid" = COALESCE("uid", "cancelToken", 'booking_' || "id"::text);

ALTER TABLE "bookings"
ALTER COLUMN "uid" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "bookings_uid_key" ON "bookings"("uid");
CREATE INDEX IF NOT EXISTS "bookings_assignedHostId_startTime_endTime_idx" ON "bookings"("assignedHostId", "startTime", "endTime");

DROP INDEX IF EXISTS "bookings_confirmed_unique_slot";
CREATE UNIQUE INDEX IF NOT EXISTS "bookings_active_host_slot_unique"
ON "bookings" ("assignedHostId", "startTime")
WHERE "status" IN ('ACCEPTED', 'PENDING') AND "assignedHostId" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "attendees" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "userId" INTEGER,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timeZone" TEXT NOT NULL,
    "language" TEXT DEFAULT 'en',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "noShow" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "attendees_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "attendees_bookingId_idx" ON "attendees"("bookingId");
CREATE INDEX IF NOT EXISTS "attendees_email_idx" ON "attendees"("email");

CREATE TABLE IF NOT EXISTS "booking_references" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "meetingId" TEXT,
    "meetingPassword" TEXT,
    "meetingUrl" TEXT,
    "externalCalendarId" TEXT,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "credentialId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "booking_references_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "booking_references_bookingId_idx" ON "booking_references"("bookingId");

ALTER TABLE "attendees"
ADD CONSTRAINT "attendees_bookingId_fkey"
FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "attendees"
ADD CONSTRAINT "attendees_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "booking_references"
ADD CONSTRAINT "booking_references_bookingId_fkey"
FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "attendees" ("bookingId", "email", "name", "timeZone", "language", "isPrimary")
SELECT
  b."id",
  b."bookerEmail",
  b."bookerName",
  COALESCE(NULLIF(b."metadata"->>'attendeeTimeZone', ''), 'UTC'),
  COALESCE(NULLIF(b."metadata"->>'attendeeLanguage', ''), 'en'),
  true
FROM "bookings" b
WHERE NOT EXISTS (
  SELECT 1 FROM "attendees" a WHERE a."bookingId" = b."id" AND a."isPrimary" = true
);

INSERT INTO "booking_references" ("bookingId", "type", "uid", "meetingUrl", "externalCalendarId", "deleted")
SELECT
  b."id",
  COALESCE(reference.value->>'type', 'booking'),
  COALESCE(reference.value->>'uid', b."uid"),
  reference.value->>'meetingUrl',
  reference.value->>'externalCalendarId',
  COALESCE((reference.value->>'deleted')::boolean, false)
FROM "bookings" b
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(b."metadata"->'references', '[]'::jsonb)) AS reference(value)
WHERE NOT EXISTS (
  SELECT 1
  FROM "booking_references" br
  WHERE br."bookingId" = b."id"
    AND br."uid" = COALESCE(reference.value->>'uid', b."uid")
    AND br."type" = COALESCE(reference.value->>'type', 'booking')
);
