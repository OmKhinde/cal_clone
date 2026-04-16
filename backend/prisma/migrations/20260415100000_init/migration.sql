-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('CONFIRMED', 'CANCELLED', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "SchedulingType" AS ENUM ('ONE_ON_ONE', 'ROUND_ROBIN', 'COLLECTIVE', 'GROUP');

-- CreateEnum
CREATE TYPE "PeriodType" AS ENUM ('UNLIMITED', 'ROLLING', 'RANGE');

-- CreateEnum
CREATE TYPE "BookingLimitFrequency" AS ENUM ('DAY', 'WEEK', 'MONTH');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_types" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "teamId" INTEGER,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "duration" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "schedulingType" "SchedulingType" NOT NULL DEFAULT 'ONE_ON_ONE',
    "maxAttendees" INTEGER,
    "timeZone" TEXT,
    "periodType" "PeriodType" NOT NULL DEFAULT 'ROLLING',
    "periodDays" INTEGER,
    "periodStartDate" TIMESTAMP(3),
    "periodEndDate" TIMESTAMP(3),
    "minimumBookingNotice" INTEGER NOT NULL DEFAULT 0,
    "beforeEventBuffer" INTEGER NOT NULL DEFAULT 0,
    "afterEventBuffer" INTEGER NOT NULL DEFAULT 0,
    "bookingLimitEnabled" BOOLEAN NOT NULL DEFAULT false,
    "bookingLimitCount" INTEGER,
    "bookingLimitFrequency" "BookingLimitFrequency",
    "locations" JSONB,
    "bookingFields" JSONB,
    "requiresConfirmation" BOOLEAN NOT NULL DEFAULT false,
    "price" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "paymentEnabled" BOOLEAN NOT NULL DEFAULT false,
    "successRedirectUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_type_hosts" (
    "id" SERIAL NOT NULL,
    "eventTypeId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "isFixed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "event_type_hosts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availability" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" SERIAL NOT NULL,
    "eventTypeId" INTEGER NOT NULL,
    "assignedHostId" INTEGER,
    "bookerName" TEXT NOT NULL,
    "bookerEmail" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "notes" TEXT,
    "cancelToken" TEXT,
    "rescheduled" BOOLEAN NOT NULL DEFAULT false,
    "fromRescheduleId" INTEGER,
    "responses" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "stripePaymentId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE UNIQUE INDEX "teams_slug_key" ON "teams"("slug");
CREATE INDEX "event_types_slug_idx" ON "event_types"("slug");
CREATE INDEX "event_types_userId_isActive_idx" ON "event_types"("userId", "isActive");
CREATE INDEX "event_types_teamId_idx" ON "event_types"("teamId");
CREATE UNIQUE INDEX "event_types_userId_slug_key" ON "event_types"("userId", "slug");
CREATE UNIQUE INDEX "event_types_teamId_slug_key" ON "event_types"("teamId", "slug");
CREATE UNIQUE INDEX "event_type_hosts_eventTypeId_userId_key" ON "event_type_hosts"("eventTypeId", "userId");
CREATE INDEX "availability_userId_idx" ON "availability"("userId");
CREATE UNIQUE INDEX "availability_userId_dayOfWeek_key" ON "availability"("userId", "dayOfWeek");
CREATE UNIQUE INDEX "bookings_cancelToken_key" ON "bookings"("cancelToken");
CREATE INDEX "bookings_eventTypeId_idx" ON "bookings"("eventTypeId");
CREATE INDEX "bookings_startTime_idx" ON "bookings"("startTime");
CREATE INDEX "bookings_status_idx" ON "bookings"("status");
CREATE INDEX "bookings_eventTypeId_startTime_idx" ON "bookings"("eventTypeId", "startTime");
CREATE UNIQUE INDEX "payments_bookingId_key" ON "payments"("bookingId");
CREATE UNIQUE INDEX "payments_stripePaymentId_key" ON "payments"("stripePaymentId");

-- Partial unique index for confirmed host-assigned bookings.
-- GROUP events intentionally keep assignedHostId null so multiple attendees can share one slot.
CREATE UNIQUE INDEX "bookings_confirmed_unique_slot"
ON "bookings" ("eventTypeId", "startTime", "assignedHostId")
WHERE "status" = 'CONFIRMED' AND "assignedHostId" IS NOT NULL;

-- AddForeignKey
ALTER TABLE "event_types" ADD CONSTRAINT "event_types_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_types" ADD CONSTRAINT "event_types_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_type_hosts" ADD CONSTRAINT "event_type_hosts_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "event_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_type_hosts" ADD CONSTRAINT "event_type_hosts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "availability" ADD CONSTRAINT "availability_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "event_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_assignedHostId_fkey" FOREIGN KEY ("assignedHostId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
