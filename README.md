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

`docker-compose.prod.yml` has no `build:` blocks. CI builds arm64 images on every push to `main`, tags them with the commit SHA and pushes them to GHCR (`ghcr.io/14m6d4/volunteerhub-{backend,frontend}`, private, 5 most recent kept). The deploy pulls them on the VM. Pulling by hand needs `docker login ghcr.io` with a token that has `read:packages`:

```
IMAGE_TAG=<commit-sha> docker compose -f docker-compose.prod.yml up -d
```

To build a prod image locally instead: `docker build --target prod ./backend`, or `docker build --target prod --build-arg VITE_API_URL=/api ./frontend`. `VITE_API_URL` is baked into the frontend bundle at build time.