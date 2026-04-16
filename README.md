# Cal Clone Monorepo

Fullstack Cal.com-style scheduling app built with a Next.js frontend and an Express + Prisma backend.

## Project Structure

- Frontend app (Next.js App Router): app, components, lib, public
- Backend API (Express + Prisma): backend/src
- Database schema and migrations: backend/prisma

## Tech Stack

### Frontend

- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- TanStack Query

### Backend

- Node.js + Express
- TypeScript
- Prisma ORM
- PostgreSQL
- Zod for validation
- Resend (optional booking emails)

### Tooling

- npm workspaces (backend is a workspace package)
- tsx (backend dev runtime)

## Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL database

## Environment Setup

### 1) Backend environment

From the repository root:

```bash
cp backend/.env.example backend/.env
```

Set these required values in backend/.env:

- DATABASE_URL
- PORT (default 4000)
- FRONTEND_URL (default http://localhost:3000)

Optional (email delivery):

- RESEND_API_KEY
- RESEND_FROM_EMAIL
- SUPPORT_EMAIL
- APP_NAME

### 2) Frontend environment (optional)

Create .env.local in the repository root only if you want to override API URL:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api
```

If not set, the frontend defaults to http://localhost:4000/api.

## Local Development Setup

Install dependencies from the repository root:

```bash
npm install
```

Apply database migrations and seed data:

```bash
npm run db:migrate
npm run db:seed
```

Run backend (terminal 1):

```bash
npm run dev:backend
```

Run frontend (terminal 2):

```bash
npm run dev
```

App URLs:

- Frontend: http://localhost:3000
- Backend health: http://localhost:4000/health
- Backend API base: http://localhost:4000/api

## Build and Production Run

From the repository root:

```bash
npm run build:backend
npm run build
```

Start backend:

```bash
npm run start:backend
```

Start frontend:

```bash
npm run start
```

## Useful Scripts

From root:

- npm run dev: frontend dev server
- npm run dev:backend: backend dev server
- npm run build: frontend build
- npm run build:backend: backend TypeScript build
- npm run typecheck
- npm run typecheck:backend
- npm run db:migrate
- npm run db:seed

Backend-only smoke check:

```bash
npm run verify:api -w backend
```

Note: verify script expects jq to be available.

## Current Capabilities

- Event type CRUD
- Weekly availability management
- Public event lookup by username and event slug
- Slot generation with booking constraints
- Booking create, list, cancel, reschedule, and attendee additions
- Booking confirmation, cancellation, and payment state endpoints
- Duplicate booking protection via transactional checks and DB constraints

## Assumptions Made

- No authentication is implemented yet.
- Admin flows run against a seeded default user (admin@calclone.dev).
- Seed data must be applied for dashboard/event type/availability screens to work.
- Backend uses PostgreSQL as the only supported database.
- Frontend and backend run as separate processes in local development.
- Email sending is best-effort and optional; booking creation does not fail if email delivery fails.

## Notes

- Generated folders such as .next, node_modules, and backend/dist are build artifacts and should not be committed.
- For backend endpoint-level details, see backend/README.md.
