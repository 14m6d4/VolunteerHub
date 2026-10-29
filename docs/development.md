# Development

There is no root `package.json`. `backend/` and `frontend/` each have their own dependencies and scripts, so run every command from inside one of them.

## Running on the host

### 1. Install dependencies

```
cd backend
npm i
cd ../frontend
npm i
```

### 2. Prepare PostgreSQL

Run a PostgreSQL 17 database, for example `docker compose up -d postgres` from the repo root. Copy `backend/.env.example` to `backend/.env` and point `DATABASE_URL` at it, using `localhost` as the host when the backend runs outside Docker. Then create the tables and, if you want, load the demo dataset:

```
cd backend
npm run db:migrate
npm run db:seed   # optional; prints the demo accounts and their generated password
```

`db:seed` wipes the database first and refuses to run when `NODE_ENV=production`. `db:seed -- --append` keeps existing data, adds no demo admin and takes the shared password from `SEED_DEMO_PASSWORD` without printing it. `db:seed -- --covers` only sets the demo cover images on demo events that already exist, and can be run again safely. `db:seed -- --reset-demo` deletes every demo user and what they own, then adds the demo data as `--append` does; production runs it nightly ([operations](operations.md#demo-reset)). These three are the only forms allowed in production.

### 3. Start the dev servers

```
cd backend
npm run dev       # API on port 5000, reloads on change
```

```
cd frontend
npm run dev       # Vite on port 5173
```

The frontend reads the API address from `VITE_API_URL` in `frontend/.env`, for example `http://localhost:5000/api`. Without it, requests go to `/api` on the same origin.

## Environment

`backend/.env` needs:

| Key | Purpose |
| --- | --- |
| `PORT`, `BACKEND_URL`, `FRONTEND_URL` | where the API listens and the two public addresses |
| `DATABASE_URL` | PostgreSQL connection string |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | initialise the Postgres container; must agree with `DATABASE_URL` |
| `JWT_SECRET` | signs access tokens |
| `EMAIL_USERNAME`, `EMAIL_PASSWORD` | the mailbox that sends verification codes |
| `TRUST_PROXY` | reverse proxies in front of the API: 0 locally, 1 in production |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | optional first admin; leave unset to skip |
| `SIGNUP_ENABLED` | `true` opens public sign-up; unset or any other value closes it, and the frontend hides every sign-up link |

`backend/.env.example` explains each key.

## Running with Docker

### 1. Setup

Copy `backend/.env.example` to `backend/.env` and fill in real secrets (JWT, email). The database defaults in `.env.example` already match the dev compose Postgres, where the host is `postgres`, the compose service name, not `localhost`.

Create `frontend/.env`:

```
VITE_API_URL=http://localhost:5000/api
```

### 2. Start the dev stack

```
docker compose up --build
```

This starts `postgres`, `backend` (port 5000) and `frontend` (the Vite dev server on port 5173), with the source mounted as volumes. Edits to `backend/` or `frontend/src/` reload without a rebuild.

A container reads its env file only when it is created, so `docker compose restart <service>` does not pick up a changed `backend/.env` or `frontend/.env`. Recreate the container:

```
docker compose up -d --force-recreate backend
```

If `backend/.env` was saved by a Windows editor, `\r` line endings can make Docker's `env_file` parser pick the wrong, commented-out value of a duplicated key such as `DATABASE_URL`. To see what the container actually got: `docker compose exec backend sh -c 'echo $DATABASE_URL'`.

### 3. Schema and demo data

The dev stack never migrates by itself. Run this after the first `up` and after pulling schema changes:

```
docker compose exec backend npm run db:migrate
docker compose exec backend npm run db:seed   # optional demo dataset
```

The data lives in the `pg-data` volume. `docker compose down -v` deletes it, and you have to migrate and seed again.

## Changing the schema

Edit `backend/db/schema.ts`, then run `npm run db:generate` to write a new SQL migration into `backend/drizzle/`. Read the generated SQL before committing it: every migration has to follow the expand/contract rule in [deployment](deployment.md#migrations). Never edit a migration or a `drizzle/meta/` snapshot that is already committed.

## Checks

The project has no unit test framework. Behaviour checks are scripts that start the real app and call it over HTTP. They need `DATABASE_URL` pointing at a migrated Postgres, and CI runs all of them. `check:users` signs accounts up, so run it with `SIGNUP_ENABLED=true`, as CI does.

| Script | Covers |
| --- | --- |
| `npm run smoke:security` | security headers, CORS, rate limits |
| `npm run check:authz` | horizontal and vertical authorization |
| `npm run check:users` | sign-up, verification, login, profiles, bans, admin user management |
| `npm run check:events` | events and registrations |
| `npm run check:social` | posts, likes, comments, discussions, feed, friends |
| `npm run check:notifications` | notifications, reports, admin analytics |
| `npm run check:observability` | request IDs, logs, metrics |
| `npm run check:uploads` | image storage and cleanup |
| `npm run check:seed` | the seed script and its production flags |

The frontend has `npm run lint` (ESLint), `npm run build` (typecheck and Vite build) and `npm run check:csv` (the admin CSV export helper, plain Node with no database).

Review rules are in [CODING_STANDARDS.md](../CODING_STANDARDS.md).
