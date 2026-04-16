# Cal.com Clone Backend

Express + TypeScript + Prisma backend for the Cal.com clone assignment.

## Setup

```bash
npm install
cp backend/.env.example backend/.env
```

Set `DATABASE_URL` in `backend/.env`, then run:

```bash
npm run db:migrate
npm run db:seed
npm run dev
```

The server starts on `http://localhost:4000`.

Optionally run a small smoke check after the server is running:

```bash
npm run verify:api -w backend
```

The script uses `jq`, so install it or run the listed curl commands manually if needed.

## Environment

```env
DATABASE_URL="postgresql://user:password@localhost:5432/cal_clone?schema=public"
PORT=4000
NODE_ENV=development
FRONTEND_URL="http://localhost:3000"
RESEND_API_KEY="re_..."
RESEND_FROM_EMAIL="bookings@yourdomain.com"
SUPPORT_EMAIL="support@yourdomain.com"
APP_NAME="Cal Clone"
```

To enable booking confirmation emails, create a Resend account, verify a sender address or domain, generate an API key, and place those values in `backend/.env`.

If you use Neon or another PgBouncer-style pooled Postgres endpoint with Prisma, use the pooled host with:

```env
DATABASE_URL="postgresql://user:password@your-pooler-host/db?sslmode=require&pgbouncer=true&connection_limit=10&pool_timeout=30&connect_timeout=20"
```

Without `pgbouncer=true`, Prisma can become flaky under concurrent requests and you may see bursts of 500s after a few successful API calls. If your frontend makes several requests in parallel, very low values like `connection_limit=1` or `connection_limit=5` can also trigger `P2024` pool timeouts.

## API

### Event Types

- `GET /api/event-types`
- `GET /api/event-types/:slug`
- `POST /api/event-types`
- `PATCH /api/event-types/:id`
- `DELETE /api/event-types/:id`

Example create body:

```json
{
  "title": "45 Minute Pairing",
  "description": "Pair programming session",
  "duration": 45,
  "slug": "pairing",
  "color": "#2563eb",
  "schedulingType": "ONE_ON_ONE",
  "periodType": "ROLLING",
  "periodDays": 30,
  "minimumBookingNotice": 120,
  "beforeEventBuffer": 10,
  "afterEventBuffer": 10,
  "locations": [{ "type": "google-meet" }],
  "bookingFields": [
    {
      "id": "topic",
      "label": "What would you like to discuss?",
      "type": "textarea",
      "required": true
    }
  ]
}
```

Supported event type configuration:

- `schedulingType`: `ONE_ON_ONE`, `ROUND_ROBIN`, `COLLECTIVE`, `GROUP`
- `maxAttendees`: required only for `GROUP`
- `periodType`: `UNLIMITED`, `ROLLING`, `RANGE`
- `periodDays`: required for `ROLLING`
- `periodStartDate` and `periodEndDate`: required for `RANGE`
- `minimumBookingNotice`, `beforeEventBuffer`, `afterEventBuffer`: minutes
- `bookingLimitEnabled`, `bookingLimitCount`, `bookingLimitFrequency`
- `locations` and `bookingFields`: JSON configuration arrays
- `isHidden`: hides from a future public profile page but keeps the direct URL bookable
- `requiresConfirmation`, `paymentEnabled`, `price`, `currency`: stored for advanced booking flows

Deleting an event type is a soft delete and returns the deactivated record:

```json
{
  "data": {
    "id": 1,
    "isActive": false,
    "bookingUrl": "http://localhost:3000/demo/30min"
  }
}
```

### Public Event Resolver

- `GET /api/public/event/:username/:slug`

Example:

```bash
curl http://localhost:4000/api/public/event/demo/30min
```

This returns only public-safe event type fields for rendering a booking page. Internal constraints such as buffers and booking limits are intentionally not exposed.

### Availability

- `GET /api/availability`
- `PUT /api/availability`

Example update body:

```json
{
  "timezone": "Asia/Kolkata",
  "schedule": [
    { "dayOfWeek": "MONDAY", "startTime": "09:00", "endTime": "17:00", "isActive": true },
    { "dayOfWeek": "TUESDAY", "startTime": "09:00", "endTime": "17:00", "isActive": true }
  ]
}
```

### Slots

- `GET /api/slots?eventTypeId=1&date=2026-04-20`

Returns UTC slot start times with labels formatted in the host timezone.

Slot generation applies the event type configuration:

- `periodType`, `periodDays`, `periodStartDate`, and `periodEndDate`
- `minimumBookingNotice`
- `beforeEventBuffer` and `afterEventBuffer`
- `bookingLimitEnabled`, `bookingLimitCount`, and `bookingLimitFrequency`
- `GROUP` capacity through `maxAttendees`

For `GROUP` events, available slots include `remainingSeats`.

### Bookings

- `POST /api/bookings`
- `GET /api/bookings?status=upcoming`
- `GET /api/bookings?status=past`
- `GET /api/bookings/:id`
- `PATCH /api/bookings/:id/cancel`

Example booking body:

```json
{
  "eventTypeId": 1,
  "bookerName": "Rahul Sharma",
  "bookerEmail": "rahul@example.com",
  "startTime": "2026-04-20T03:30:00.000Z"
}
```

Successful bookings also attempt to send a confirmation email through Resend to the primary attendee. Delivery failures are logged and never block the booking from being created.

## Double Booking Protection

The backend uses two layers:

- Slot availability is re-generated inside the booking transaction.
- Booking transactions run with serializable isolation.
- PostgreSQL enforces a partial unique index on confirmed host-assigned bookings:

```sql
CREATE UNIQUE INDEX "bookings_confirmed_unique_slot"
ON "bookings" ("eventTypeId", "startTime", "assignedHostId")
WHERE "status" = 'CONFIRMED' AND "assignedHostId" IS NOT NULL;
```

Cancelled bookings do not block the same slot from being booked again. Group bookings keep `assignedHostId` null so the same slot can be booked until `maxAttendees` is reached.

## Assumptions

- No authentication is required.
- Admin APIs operate on the seeded default user `admin@calclone.dev`.
- Username-based public routing is implemented as `/api/public/event/:username/:slug`.
- Event type configuration fields for team modes, payments, custom booking fields, buffers, and limits are stored and validated.
- Full round-robin, collective, group-capacity slot generation, Stripe webhooks, multiple schedules, and date overrides are left as bonus extensions.
