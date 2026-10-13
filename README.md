# VolunteerHub

[![CI/CD](https://github.com/14m6d4/VolunteerHub/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/14m6d4/VolunteerHub/actions/workflows/ci.yml)
[![Restore check](https://github.com/14m6d4/VolunteerHub/actions/workflows/restore-check.yml/badge.svg?branch=main)](https://github.com/14m6d4/VolunteerHub/actions/workflows/restore-check.yml)

A volunteer event platform: volunteers find and register for events, managers run them, admins moderate. React 19 + Vite on the front, Express 5 + Drizzle + PostgreSQL behind it, all TypeScript.

It runs in production at <https://volunteerhub.l4mbd4.me> on a single ARM VM, shared with other self-hosted services. This page explains how it gets there, how it stays up, and how its data is protected.

## Architecture

```mermaid
flowchart LR
  user([Browser]) --> cf["Cloudflare<br/>DNS, TLS, proxy"]

  subgraph vm["VM (arm64)"]
    traefik[Traefik] --> fe["frontend<br/>nginx + React SPA"]
    traefik -->|/api| be["backend<br/>Express"]
    migrate["migrate<br/>one-shot"] --> pg[("PostgreSQL 17")]
    be --> pg
    backup["backup<br/>pg_dump + rclone"] --> pg
    alloy[Grafana Alloy]
    kuma[Uptime Kuma]
  end

  cf --> traefik
  be -.->|metrics| alloy
  alloy -->|metrics + logs| grafana[Grafana Cloud]
  backup -->|daily dump| store[("Object Storage")]

  gha[GitHub Actions] -->|arm64 images| ghcr[("GHCR")]
  gha -->|deploy over SSH| vm
  ghcr -->|docker pull| vm

  store -->|monthly restore check| gha
  grafana -->|alerts| discord[Discord]
  kuma -->|downtime| discord
  gha -->|failed restore| discord
```

The app's own containers (frontend, backend, migrate, backup, Postgres) are defined in [`docker-compose.prod.yml`](docker-compose.prod.yml); Traefik, Alloy and Uptime Kuma serve the whole VM. Postgres has no published port. Traefik never routes the backend's `/metrics`, and the app refuses it for any proxied request.

## From commit to production

Everything lives in one workflow, [`ci.yml`](.github/workflows/ci.yml):

1. **Checks.** The backend is typechecked and built, its migrations are applied to an empty Postgres service container, and HTTP-level checks run against the real app: security headers, CORS and rate limits, authorization (horizontal and vertical), and each domain's API. The frontend is linted and built.
2. **arm64 build.** Images for the backend, frontend and backup job are built on a native `ubuntu-24.04-arm` runner, so they match the VM without QEMU emulation.
3. **SHA tags.** Each image is tagged with the full commit SHA and pushed to GHCR. Only the 5 newest versions are kept.
4. **Pull-based deploy.** The VM never builds anything. The deploy checks out the SHA (for the compose file only), pulls the images and restarts. A one-shot `migrate` container applies pending SQL migrations first, and the backend starts only if it succeeds.
5. **Smoke test.** From the VM, through Cloudflare and Traefik, the deploy checks the web root, the database-backed `/api/health` and a real API route. It checks response bodies, not just status codes.
6. **Auto-rollback.** The VM records the last SHA that passed its smoke test. If a deploy fails, it redeploys that SHA, tests it again and marks the run red, so production recovers and the bad release still gets noticed.

A manual rollback is a `workflow_dispatch` run with any retained SHA. Production deploys are serialized and never cancelled mid-flight.

Migrations follow an expand/contract rule: a release may only add what the previous release tolerates, so an automatic rollback still works against the already-migrated schema. Why the data moved from MongoDB to PostgreSQL is recorded in [ADR 0001](docs/adr/0001-move-from-mongodb-to-postgresql.md).

## Monitoring

The backend logs structured JSON with a request ID on every line, and exposes request rate, error rate and latency per route as Prometheus metrics. One Grafana Alloy agent ships host metrics, per-container metrics, container logs and the app's metrics for the whole VM to Grafana Cloud. A VolunteerHub outage can then be traced to its real cause even when that cause is a neighbouring stack, for example an OOM kill or a full disk.

A Grafana dashboard puts the VM, the containers and VolunteerHub's request rate, 5xx ratio, latency and logs on one screen.

Alerts are symptom-based and go to Discord:

| Alert | Fires when |
| --- | --- |
| Disk full | Root disk above 85% for 5 min |
| Memory high | Memory above 90% for 5 min |
| 5xx rate | More than 5% of VolunteerHub requests fail with 5xx for 2 min |
| Backup stale | No successful backup in 36 h |

The first three were each fired once on purpose to confirm delivery. Uptime Kuma also polls the public site and `/api/health` through Cloudflare, the same path users take.

## Backups you can trust

- **Daily dump.** A `backup` container runs `pg_dump` once a day and uploads the compressed dump to S3-compatible object storage with rclone. A dump that fails halfway is never uploaded.
- **Retention on the server.** A bucket lifecycle rule deletes dumps after 7 days and cleans up incomplete uploads, so retention holds even if the job breaks.
- **Monthly restore drill.** [`restore-check.yml`](.github/workflows/restore-check.yml) downloads the newest dump with a read-only key, restores it into a throwaway Postgres, checks that users and an admin exist, and records how long the restore took. A failure posts to Discord.

A backup only counts if a restore has been tested, and the restore badge above shows the result of the latest drill.

## Free tiers and cost guardrails

CI, registry, monitoring, backups and the edge all run on free tiers. The accounts are pay-as-you-go, so going over a limit would mean a real bill. These guardrails keep usage inside the free allowances:

- **CI and registry:** GitHub's included free minutes, which arm64 runners count against too. GHCR keeps only 5 versions per image, so package storage stays bounded.
- **Monitoring:** Grafana Cloud's free tier. Alloy forwards only the container metrics the dashboard reads, which keeps it under the active-series cap.
- **Backups:** object storage with versioning off. The lifecycle rules cap what is stored at a week of daily dumps of tens of KB each, and one upload a day keeps requests far inside the free allowance.
- **Last line of defence:** a budget alert on the cloud account emails at the first $1 of spend.
- **Edge:** Cloudflare's free plan handles DNS, TLS and proxying.

## Running locally

### 1. Install dependencies:

Go to the `backend` folder, and run `install`.

```
cd ./backend
npm i
```

Go to the `frontend` folder, and run `install`.

```
cd ./frontend
npm i
```

### 2. Prepare PostgreSQL:

Run a PostgreSQL 17 database (e.g. `docker compose up -d postgres` from the repo root), copy `backend/.env.example` to `backend/.env` and point `DATABASE_URL` at it (use `localhost` as the host when the backend runs outside Docker). Then create the tables and, optionally, load the demo dataset:

```
cd ./backend
npm run db:migrate
npm run db:seed   # optional; prints the demo accounts and their generated password
```

`db:seed` wipes the database first and refuses to run when `NODE_ENV=production`.

### 3. Start applications:

Go to the `backend` folder, and run `dev`.

```
cd ./backend
npm run dev
```

Go to the `frontend` folder, and run `dev`.

```
cd ./frontend
npm run dev
```

## Running with Docker

### 1. Setup

Copy `backend/.env.example` to `backend/.env` and fill in real secrets (JWT, Google OAuth, VAPID, email, ImgBB). The defaults in `.env.example` already match the dev compose Postgres; the hostname `postgres` is the compose service name, not `localhost`.

Create `frontend/.env`:

```
VITE_API_URL=http://localhost:5000/api
```

### 2. Dev stack (hot reload, source mounted as volumes)

```
docker compose up --build
```

Starts `postgres`, `backend` (port 5000), `frontend` (port 5173, Vite dev server). Edits to `backend/` or `frontend/src/` hot-reload without rebuilding.

**After editing `backend/.env` or `frontend/.env`, `docker compose restart <service>` is not enough** — env vars are baked in at container *creation*, not read again on restart. Recreate instead:

```
docker compose up -d --force-recreate backend
```

**Windows/CRLF gotcha:** if `backend/.env` was edited with a Windows editor, stray `\r` line endings can make Docker's `env_file` parser resolve the wrong (commented-out) value for a duplicated key like `DATABASE_URL`. If a var isn't what you expect, check inside the container: `docker compose exec backend sh -c 'echo $DATABASE_URL'`.

### 3. Database schema and demo data

The dev stack never migrates on its own. After the first `up`, and after pulling schema changes:

```
docker compose exec backend npm run db:migrate
docker compose exec backend npm run db:seed   # optional demo dataset
```

The data lives in the `pg-data` Docker volume — `docker compose down -v` deletes it; migrate and seed again after.

### 4. Production images

`docker-compose.prod.yml` has no `build:` blocks. CI builds arm64 images on every push to `main`, tags them with the commit SHA and pushes them to GHCR (`ghcr.io/14m6d4/volunteerhub-{backend,frontend,backup}`, private, 5 most recent kept). The deploy pulls them on the VM. Pulling by hand needs `docker login ghcr.io` with a token that has `read:packages`:

```
IMAGE_TAG=<commit-sha> docker compose -f docker-compose.prod.yml up -d
```

To build a prod image locally instead: `docker build --target prod ./backend`, or `docker build --target prod --build-arg VITE_API_URL=/api ./frontend`. `VITE_API_URL` is baked into the frontend bundle at build time.