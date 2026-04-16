CREATE INDEX IF NOT EXISTS "bookings_status_startTime_idx"
ON "bookings"("status", "startTime");

CREATE INDEX IF NOT EXISTS "bookings_eventTypeId_status_startTime_idx"
ON "bookings"("eventTypeId", "status", "startTime");

CREATE INDEX IF NOT EXISTS "attendees_bookingId_isPrimary_idx"
ON "attendees"("bookingId", "isPrimary");

CREATE INDEX IF NOT EXISTS "attendees_lower_email_idx"
ON "attendees"(LOWER("email"));
