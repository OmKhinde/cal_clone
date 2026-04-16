# Cal.com Clone Backend

Backend-only implementation for the Scaler SDE Intern Fullstack Assignment. This repository currently exposes an Express + TypeScript + Prisma API that a separate frontend can consume.

## What Is Included

- Event type CRUD
- Username + slug public event routing
- Advanced event type configuration fields for scheduling modes, buffers, booking windows, booking limits, custom fields, and payment metadata
- Weekly availability settings
- Public slot generation
- Booking creation with transaction re-checks
- PostgreSQL partial unique index to prevent duplicate confirmed bookings
- Upcoming/past bookings dashboard API
- Booking cancellation
- Seed data for a default user

## Quick Start

```bash
npm install
cp backend/.env.example backend/.env
npm run db:migrate
npm run db:seed
npm run dev
```

The API runs at `http://localhost:4000/api`.

See [backend/README.md](backend/README.md) for endpoint details.
