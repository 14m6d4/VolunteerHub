# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

VolunteerHub is a MERN-style volunteer event platform. It is a two-package monorepo:

- `backend/` — Express 5 + Mongoose REST API, written in TypeScript, run directly via `tsx` (no build step in dev).
- `frontend/` — React 19 + Vite + TypeScript SPA, styled with Tailwind v4 and shadcn/ui (Radix) components.

The root `package.json` is unrelated tooling scratch space; the two real packages each have their own `package.json` and `node_modules`.

## Commands

Backend (`cd backend`):
- `npm run dev` — start API with `tsx watch` (hot reload). Default port 5000.
- `npm run build` — `tsc` typecheck/emit to `dist/` (config currently `noEmit`, so this is effectively a typecheck).
- `npm start` — run compiled `dist/server.js`.
- `npm run seed` — run `seed.ts` to populate the DB with sample data.

Frontend (`cd frontend`):
- `npm run dev` — Vite dev server (default port 5173).
- `npm run build` — `tsc -b && vite build`.
- `npm run lint` — ESLint over the project.
- `npm run preview` — preview the production build.

There is **no test runner configured** in either package (`backend` `npm test` just errors out).

First-time setup: `npm i` in both `backend/` and `frontend/`, configure `backend/.env` (see below), then run the two dev servers.

## Environment

`backend/.env` (required keys): `PORT`, `BACKEND_URL`, `FRONTEND_URL`, `MONGO_URI`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (web-push), `EMAIL_USERNAME`/`EMAIL_PASSWORD` (nodemailer OTP), `IMGBB_API_KEY` (image hosting).

`frontend/.env`: `VITE_API_URL` is the API base used by `services/api.ts` (falls back to `/api`). Point it at the backend, e.g. `http://localhost:5000/api`.

On every DB connect, `config/db.ts` auto-seeds a fixed set of admin/manager/volunteer users if no admin exists — expect those accounts to appear in any fresh database.

## Backend architecture

Strict layered flow, one file per domain at each layer:

```
routes/*.routes.ts → middlewares → controllers/*.controller.ts → services/*.service.ts → models/*.model.ts
```

- **Routes** wire middleware chains and map to controller methods. Registered in `app.ts` under `/api/*` (note: discussions mount at `/api/groups`, reports at `/api/report`, files at `/file`).
- **Controllers** are thin: parse `req`, call a service, return `res.json({ success: true, data })`. They `try/catch` and forward errors via `next(err)` — do not throw directly to the client.
- **Services** hold all business logic and Mongoose queries. This is where new domain logic belongs.
- **Models** are Mongoose schemas; the matching `types/*.ts` and inline interfaces define the TS shapes. Enums like `UserRole` (`volunteer`/`manager`/`admin`) and event/registration status enums live alongside their models/types.

Key cross-cutting middleware (`middlewares/`):
- `authMiddleware` — requires a valid `Bearer` JWT, loads the user onto `req.user`. `optionalAuthMiddleware` attaches the user if a token is present but never rejects (used for public-but-personalized endpoints like event listing).
- `roleMiddleware(['manager','admin'])` — gate by `req.user.role`; runs after `authMiddleware`.
- `validateBody(schema)` / `validateQuery` / `validateParams` — **Zod** schemas from `utils/validators.ts`. Validated/coerced data replaces `req.body` etc.
- `upload` (`upload.middleware.ts`) — Multer in-memory; controllers then push the buffer to ImgBB via `services/imgbb.service.ts` and store the returned URL.
- `error.middleware.ts` — centralized JSON error handler, registered last. Throw `AppError(message, statusCode)` (`utils/appError.ts`) or `http-errors` from services to control the response.

Auth specifics: JWT-only (no server sessions, `session: false`). Local login + email/OTP verification (`nodemailer`) and Google OAuth via Passport (`config/passport.ts`, callback in `auth.controller.ts`). Notifications use web-push (`config/webpush.ts`, `services/webpush.service.ts`) plus persisted `Notification` documents.

### TypeScript / ESM quirk (important)

The backend runs as native ESM under `tsx` with `nodenext` resolution and `allowImportingTsExtensions`. **Intra-project imports must include the explicit `.ts` extension** (e.g. `import { EventService } from "../services/event.service.ts"`). Follow this in new files or module resolution breaks. There is no compile step in dev — `tsx` executes the `.ts` sources directly.

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
- CORS in `app.ts` currently echoes any origin with `credentials: true` — auth is via Bearer token, not cookies.
