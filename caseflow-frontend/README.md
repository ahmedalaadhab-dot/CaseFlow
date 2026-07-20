# CaseFlow — Frontend

React + TypeScript + Vite frontend for the CaseFlow case management API.
Consumes the existing backend REST API as-is (see `../caseflow-backend`) —
no backend contracts were changed to build this.

## What's built

- **Auth**: login (with remember-me), forgot/reset password, protected
  routes, automatic access-token refresh on 401 (rotating refresh tokens
  stored in `localStorage`, access token kept in memory only)
- **Dashboard**: all 10 status cards + 4 charts (status breakdown, service
  breakdown, monthly completed, monthly revenue) via Recharts
- **Customers**: searchable/paginated list, detail page with full profile +
  case history, create/edit dialog
- **Cases**: searchable/paginated list with status+priority filters, detail
  page with tabs (Overview, Stages, Documents, Tasks, Payments, Timeline),
  create dialog
- **Stages/checklist**: visual stage tracker, checklist toggling, "Advance"
  button disabled until mandatory items are checked (mirrors the backend's
  own gating, so the UI never lets you try something the API will reject)
- **Kanban**: drag-and-drop board (columns = case status) using `@dnd-kit`
- **Documents**: drag-and-drop or click-to-browse upload, category picker,
  download, delete, versioning shown per file
- **Tasks & Payments**: inline add/list per case; payments recompute the
  case's payment status automatically (handled backend-side)
- **Archive**: read-only list of completed/archived cases, restore (Manager+)
- **Reports**: cases-by-employee, service popularity, overdue cases, revenue,
  average completion time — each table exports to **CSV and Excel**
  client-side (via PapaParse / SheetJS) from the same JSON the page renders,
  rather than hitting separate export endpoints
- **Settings**: office info + working hours (Manager+), profile tab for
  everyone
- **Calendar**: due-date feed across active cases
- **Global search**: top bar search across cases and customers
- Role-based UI gating (`useAuth().hasRole(...)`, `<RoleGate>`, `<RequireRole>`)
  mirroring the backend's RBAC — the UI hides/disables what a role can't do,
  but the backend is still the real enforcement point
- Responsive: collapsible sheet-based sidebar under `lg` breakpoint,
  cards/tables that reflow to single-column on mobile

## Design

Navy/white/light-gray palette with a teal accent for primary actions,
rounded cards, dashboard-style layout — matches the spec's requested look.
Case numbers, CPR/passport numbers, and monetary figures render in a
monospace face (`font-tag` utility class) as a deliberate "registry ledger"
touch, distinct from generic dashboard UI.

## Not yet built

A dedicated appointment/expiry-date model for the calendar (it currently
shows case due dates, which covers deadlines but not e.g. in-person
appointments — would need a small `Appointment` model added to the
backend). Notification bell/inbox UI (backend has `Notification` rows
via `NotificationProvider`, but no `GET /api/notifications` endpoint or
frontend panel yet — natural next addition, same pattern as `/api/search`).
Service-template admin UI (backend CRUD exists; no settings screen for it
yet — needed before a non-technical admin can add/edit workflow stages
without direct API calls). Keyboard shortcuts, pinned cases/favorite
customers (schema exists: `PinnedCase`, `FavoriteCustomer` — no UI wired
to them yet), dark mode toggle (design tokens are CSS variables, so this
mostly just needs a `.dark` class + toggle, no restructuring).

## Getting started

```bash
cp .env.example .env
npm install
npm run dev
```

Runs at `http://localhost:5173`; the Vite dev server proxies `/api` to
`http://localhost:4000` (the backend) — see `vite.config.ts`. Make sure the
backend is running and seeded (`npm run seed` in `../caseflow-backend`)
first, then log in with `owner@caseflow.test` / `Password123!`.

## Getting started (Docker)

This frontend's `Dockerfile`/`nginx.conf` expect a sibling `api` service
(matching `../caseflow-backend`'s Docker Compose service name) on the same
Docker network. Simplest way to run both together: copy this folder's
`Dockerfile` reference into the backend's `docker-compose.yml` as a second
service, e.g.:

```yaml
  web:
    build: ../caseflow-frontend
    restart: unless-stopped
    depends_on:
      - api
    ports:
      - "8080:80"
```

Then `docker compose up --build` from the backend folder. The app will be
at `http://localhost:8080`.

## Build

```bash
npm run build   # outputs to dist/
npm run preview # serve the production build locally
```

## Extending

- New page: add a file under `src/pages`, wire a `<Route>` in `src/App.tsx`,
  add a `NAV_ITEMS` entry in `src/components/layout/Sidebar.tsx` if it
  belongs in the main nav.
- New API-backed data: add a hook in `src/hooks` following the pattern in
  `useCases.ts` (TanStack Query + the `unwrap()` helper from
  `src/lib/api-client.ts`).
- New UI primitive: follow the shadcn/ui convention already used in
  `src/components/ui` — Radix primitive + `cva` variants + `cn()` merge.
