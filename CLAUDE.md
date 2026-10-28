# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

VolunteerHub is a MERN-style volunteer event platform. It is a two-package monorepo:

- `backend/` — Express 5 + Drizzle/PostgreSQL REST API, written in TypeScript, run directly via `tsx` (no build step in dev).
- `frontend/` — React 19 + Vite + TypeScript SPA, styled with Tailwind v4 and shadcn/ui (Radix) components.

There is no root `package.json`; each package has its own `package.json` and `node_modules`.

## Commands

Backend (`cd backend`):
- `npm run dev` — start API with `tsx watch` (hot reload). Default port 5000.
- `npm run build` — `tsc` typecheck + emit to `dist/` (`.ts` import specifiers rewritten to `.js`).
- `npm start` — run compiled `dist/server.js`. This is what the prod Docker image runs (no `tsx` in prod).
- `npm run db:generate` — drizzle-kit: turn `db/schema.ts` changes into a new SQL migration in `backend/drizzle/`.
- `npm run db:migrate` — apply pending migrations to `DATABASE_URL` (via `tsx`). Prod runs the compiled `node dist/db/migrate.js` as the one-shot `migrate` compose service.
- `npm run db:seed` — wipe the database and load the dev/demo dataset, demo cover images included (`scripts/seed.ts`; prints the generated password for the `demo-*@demo.volunteerhub.test` accounts). In production only two flags run, via the compiled `node dist/scripts/seed.js`: `--append` adds the demo data without wiping, and needs `SEED_DEMO_PASSWORD`. `--covers` only sets the demo covers from `scripts/demo-covers/` on existing demo events and is safe to re-run. `npm run check:seed` covers both.

Frontend (`cd frontend`):
- `npm run dev` — Vite dev server (default port 5173).
- `npm run build` — `tsc -b && vite build`.
- `npm run lint` — ESLint over the project.
- `npm run preview` — preview the production build.
- `npm run check:csv` — assert-based check of the admin CSV export helper (`src/utils/csv.ts`), run by plain Node with no database.

Behaviour checks are the `backend` scripts `npm run smoke:security` and `npm run check:*`. They need `DATABASE_URL` pointing at a migrated Postgres, and CI runs all of them (`.github/workflows/ci.yml`). There is no test framework (`npm test` errors out). Review rules: `CODING_STANDARDS.md`.

First-time setup: `npm i` in both `backend/` and `frontend/`, configure `backend/.env` (see below), then run the two dev servers.

## Environment

`backend/.env` (required keys): `PORT`, `BACKEND_URL`, `FRONTEND_URL`, `JWT_SECRET`, `EMAIL_USERNAME`/`EMAIL_PASSWORD` (nodemailer OTP), `DATABASE_URL` + `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB` (PostgreSQL; the prod `postgres` container reads the trio from this same file, so they must agree with `DATABASE_URL`).

`.env.backup` (prod VM only, next to `docker-compose.prod.yml`): the OCI bucket's write key for the `backup` service (`backup/`): `OCI_S3_ENDPOINT`, `OCI_S3_REGION`, `OCI_S3_BUCKET`, `OCI_S3_ACCESS_KEY_ID`, `OCI_S3_SECRET_ACCESS_KEY`.

`frontend/.env`: `VITE_API_URL` is the API base used by `services/api.ts` (falls back to `/api`). Point it at the backend, e.g. `http://localhost:5000/api`.

On every DB connect, `config/db.ts` seeds a single admin from `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`, and only if no admin exists yet. Leave those two vars unset (the default) and seeding is skipped entirely — never hardcode credentials here.

## Backend architecture

Strict layered flow, one file per domain at each layer:

```
routes/*.routes.ts → middlewares → controllers/*.controller.ts → services/*.service.ts → db/schema.ts (Drizzle)
```

- **Routes** wire middleware chains and map to controller methods. Registered in `app.ts` under `/api/*` (note: discussions mount at `/api/groups`, reports at `/api/report`, files at `/file`).
- **Controllers** are thin: parse `req`, call a service, return `res.json({ success: true, data })`. They `try/catch` and forward errors via `next(err)` — do not throw directly to the client.
- **Services** hold all business logic and Drizzle queries. This is where new domain logic belongs.
- **Schema** is `db/schema.ts` (Drizzle tables and enums); the matching `types/*.ts` and inline interfaces define the TS shapes. Enums like `UserRole` (`volunteer`/`manager`/`admin`) and event/registration/notification/report enums live in `types/*.ts`.

Key cross-cutting middleware (`middlewares/`):
- `authMiddleware` — requires a valid `Bearer` JWT, loads the user onto `req.user`. `optionalAuthMiddleware` attaches the user if a token is present but never rejects (used for public-but-personalized endpoints like event listing).
- `roleMiddleware(['manager','admin'])` — gate by `req.user.role`; runs after `authMiddleware`.
- `validateBody(schema)` / `validateQuery` / `validateParams` — **Zod** schemas from `utils/validators.ts`. Validated/coerced data replaces `req.body` etc.
- `uploadImage(field)` (`upload.middleware.ts`) — Multer in-memory, 2 MB per file. `services/image.service.ts` re-encodes the buffer to WebP in `UPLOADS_DIR` (default `uploads/`, a named volume in prod) and returns the `/uploads/<name>.webp` path the DB stores; it refuses uploads once the folder holds 5 GB. Whoever replaces or deletes an image's owner (avatar, cover, post, event, user) calls `deleteImages` with the old paths. `npm run check:uploads` covers it.
- `observability.middleware.ts` — pino JSON request log with a request ID (`X-Request-Id`, echoed or generated) and `prom-client` RED metrics. `/metrics` is internal-only (never under `/api`, no Traefik route, refused when `X-Forwarded-For` is set). `npm run check:observability` covers it.
- `error.middleware.ts` — centralized JSON error handler, registered last. Throw `AppError(message, statusCode)` (`utils/appError.ts`) or `http-errors` from services to control the response.

Auth specifics: JWT-only (no server sessions). Auth is local login with email/OTP verification (`nodemailer`) only; there is no third-party sign-in. Notifications are persisted `notifications` rows (no push delivery).

### TypeScript / ESM quirk (important)

The backend runs as native ESM under `tsx` with `nodenext` resolution and `rewriteRelativeImportExtensions`. **Intra-project imports must include the explicit `.ts` extension** (e.g. `import { EventService } from "../services/event.service.ts"`). Follow this in new files or module resolution breaks. There is no compile step in dev — `tsx` executes the `.ts` sources directly; prod runs the `tsc` output.

## Database migrations (PostgreSQL, Drizzle)

PostgreSQL replaces MongoDB (see `docs/adr/0001-move-from-mongodb-to-postgresql.md`); every domain now lives there and no code imports Mongoose. The schema lives in `backend/db/schema.ts`; migrations are plain SQL in `backend/drizzle/`, generated with `npm run db:generate` and committed. Never hand-edit an already-committed migration or the `drizzle/meta/` snapshots.

**Expand/contract rule (mandatory).** Every migration must be backward-compatible with the previous release, because the deploy automatically rolls back to the last known-good image on a failed smoke test, and the old image then runs against the already-migrated schema. So a release may only *expand*: add tables, add nullable columns or columns with a default, add indexes, add enum values. Anything destructive or incompatible (drop/rename a column or table, add a NOT NULL column without a default, narrow a type, drop an enum value) is a *contract* step and ships in a **later** release, after no deployed code uses the old shape. To rename: add the new column, dual-write and backfill, switch reads, and only then drop the old one, each in its own release. Before committing a migration, read the generated SQL and check it against this rule; if it breaks the rule, split it.

*Documented exception:* `0001_users_and_push_subscriptions.sql` adds `users.username` as NOT NULL without a default. That is safe only because the `users` table from `0000` was an unused stub, empty in every environment, and no released image inserts into it. An exception like this needs the same proof (the table is empty and unused by the previous release) and a comment in the migration; it does not apply to tables that hold data.

The app never migrates on startup: the `migrate` compose service applies migrations before the backend starts, and a failing migration fails the deploy.

## Frontend architecture

- **Entry/routing**: `src/App.tsx` defines all routes with `react-router-dom` v7. Routes are grouped by layout (with NavBar+Footer, the admin sidebar layout, and bare auth pages). Provider stack (outer→inner): `QueryProvider` (react-query) → `AuthProvider` → `ThemeProvider` → `BrowserRouter`.
- **Auth state**: `src/context/AuthContext.tsx` is the source of truth. The JWT lives in `localStorage` under `accessToken`; `services/api.ts` reads it and sets the `Authorization` header. Calling `setAuthToken`/`clearAuth` dispatches an `authTokenChanged` event that re-syncs the context. Banned users are redirected to `/banned`.
- **Route protection**: `components/auth/ProtectedRoute.tsx` takes `allowedRoles` and is used as a layout `<Route element>` wrapper (see `/manage-events` and `/manage/*` in `App.tsx`).
- **API access**: every network call goes through `apiFetch` in `src/services/api.ts` (a thin `fetch` wrapper handling base URL, auth header, FormData, JSON, and error normalization). Domain calls are organized as `src/services/*.service.ts` exporting plain async functions; React components consume them through hooks in `src/hooks/use*.ts` (often react-query). When adding an endpoint, add a function to the matching `*.service.ts`, not raw `fetch` in components.
- **UI**: `src/components/ui/*` are generated shadcn/Radix primitives (config in `components.json`) — prefer composing these over new primitives. Feature components live under `src/components/<feature>/`, full pages under `src/pages/`. The `@` alias maps to `src/` (Vite + tsconfig).
- `src/pages/test/*` and `src/data/*-mock.ts` are scratch/mock scaffolding, not production routes.

## API conventions

- Success responses: `{ success: true, data }` (or `{ success: true, ...result }` for paginated lists with `page`/`limit`). Some endpoints use `{ status, message }`.
- Errors: centralized handler returns `{ status, message }` (plus `stack` when `NODE_ENV !== 'production'`). The frontend `apiFetch` throws an `Error` whose message is `data.message || data.error`.
- CORS in `app.ts` allows only `FRONTEND_URL` and `http://localhost:5173` (prod is same-origin, so this mainly serves the dev server) — auth is via Bearer token, not cookies.

## Agent skills

### Issue tracker

Issues and specs live as GitHub issues in `14m6d4/VolunteerHub`, managed with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`), applied as GitHub labels. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
