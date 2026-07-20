# CaseFlow — Backend

Case management API for offices processing government-related services
(residence permits, work visas, IDs, passports, licenses, company
registrations).

## Status: this is a scoped first slice, not the whole spec

Implemented end-to-end (schema → repository → service → controller → routes → RBAC):

- **Auth**: login, refresh (rotating), logout, forgot/reset password, `/me`
- **Customers**: CRUD, search, pagination
- **Cases**: create (snapshotting a service template's stages onto the case),
  update, list/search/filter, stage advancement gated on mandatory checklist
  completion, checklist toggling, archive/restore, timeline events
- **Notifications**: `NotificationProvider` interface + in-app channel only,
  wired so WhatsApp/SMS/Email/Push can be added as new provider classes with
  no changes to calling code
- **Storage**: `StorageProvider` interface + local filesystem implementation,
  so S3 can be added later as a second implementation
- Full **Prisma schema** for every entity in the spec (Users, Customers,
  Cases, CaseStages, ServiceTemplates, TemplateStages, Documents, Tasks,
  TimelineEvents, Notifications, Payments, AuditLogs, Settings) — the schema
  is complete even though not every module has a service/controller yet.

## Also implemented (added for the frontend build)

- **Service templates**: full CRUD for workflow templates/stages/checklists (Manager+)
- **Documents**: upload (multer, 25MB default limit, PDF/JPG/PNG/DOCX), versioning by filename, delete
- **Tasks**: create/update/delete per case, notifies assignee
- **Payments**: record payments per case; auto-recomputes the case's `paymentStatus`
- **Dashboard**: `/api/dashboard/summary` (the status cards) and `/api/dashboard/charts` (status/service/monthly breakdowns)
- **Reports**: cases-by-employee, revenue, service popularity, average completion time, overdue cases, customer history — all return JSON; CSV/Excel/PDF export happens client-side in the frontend from this JSON (see frontend README) rather than as separate export endpoints
- **Settings**: flexible key/value store (office info, theme, working hours, custom priorities/statuses)
- **Global search**: `/api/search?q=` across cases and customers

Tasks/payments/dashboard/reports/settings/search are each implemented as a
single route file (repository+service+controller inlined) rather than five
separate files, since they're thinner than `cases`/`customers` — split them
out if they grow.

## Not yet built

Audit log writer middleware (the `AuditLog` model exists but nothing writes
to it automatically yet — currently `TimelineEvent` covers per-case history),
calendar aggregation endpoint (appointments/deadlines/expiries in one feed),
user administration (create/deactivate users) endpoints, WhatsApp/SMS/Email
notification channels (interface is ready, see `NotificationProvider`), S3
storage (interface is ready, see `StorageProvider`).

## Tech stack

Node.js, Express, TypeScript, PostgreSQL, Prisma, JWT + rotating refresh
tokens, Zod validation, bcrypt, Helmet, CORS, express-rate-limit.

## Getting started (local, without Docker)

```bash
cp .env.example .env
# edit .env — set real JWT secrets and DATABASE_URL if not using the defaults

npm install
npx prisma migrate dev --name init
npm run seed
npm run dev
```

API will be at `http://localhost:4000`. Health check: `GET /health`.

### Sample users (from seed)

| Role      | Email                  | Password      |
|-----------|-------------------------|---------------|
| Owner     | owner@caseflow.test     | Password123!  |
| Manager   | manager@caseflow.test   | Password123!  |
| Employee  | employee@caseflow.test  | Password123!  |
| Reception | reception@caseflow.test | Password123!  |
| Viewer    | viewer@caseflow.test    | Password123!  |

## Getting started (Docker)

```bash
docker compose up --build
docker compose exec api npx prisma migrate deploy
docker compose exec api npm run seed
```

## Architecture

Clean/modular structure. Each feature module (`src/modules/<name>`) contains:

- `*.dto.ts` — Zod schemas (validation + inferred TypeScript types)
- `*.repository.ts` — the only file allowed to call Prisma directly for that entity
- `*.service.ts` — business rules, orchestration, calls repository + other services
- `*.controller.ts` — thin HTTP layer: parse request → call service → shape response
- `*.routes.ts` — Express Router, wires `requireAuth`/`requireRole` per endpoint

Shared code lives in `src/common` (errors, middleware, pagination, storage
abstraction) and `src/config` (env validation, Prisma client singleton).

### Extending the API

To add a new module (e.g. `tasks`), copy the `customers` module's five files
as a template, adjust the Prisma calls/DTOs, then mount the router in
`src/app.ts`. This keeps every module consistent and easy for another
developer to pick up.

### Response shape

Every endpoint returns:

```json
{ "success": true, "data": { ... }, "meta": { "page": 1, "pageSize": 20, "totalCount": 42, "totalPages": 3 } }
```

or on error:

```json
{ "success": false, "error": { "message": "...", "details": { ... } } }
```

### RBAC

`requireRole("MANAGER", "EMPLOYEE")` on a route means Manager and Employee
(and always Owner) can call it; Reception/Viewer get a 403. See
`src/common/middleware/auth.ts`.

## Testing

`npm test` runs Vitest. No test files are included yet in this slice —
recommended first tests: `case.service.ts` stage-advancement checklist
gating, and `auth.service.ts` refresh token rotation.

## Environment variables

See `.env.example` for the full list with comments.
