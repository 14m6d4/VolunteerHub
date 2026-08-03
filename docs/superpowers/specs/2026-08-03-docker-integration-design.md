# Docker Integration — Design

Date: 2026-08-03

## Purpose

Add Docker support to VolunteerHub for two use cases:
1. **Dev environment** — one command spins up mongo + backend + frontend with hot reload, replacing manual `npm i`/`npm run dev` in two terminals plus a local/Atlas Mongo.
2. **Production** — buildable images for later deploy to a VPS on domain `l4mbd4.me`. No VPS exists yet; reverse proxy/TLS (Caddy/Traefik) is explicitly deferred until a VPS is provisioned. This spec only covers building and running the containers, exposing plain ports.

## Key constraint discovered

Backend `tsc` build has `noEmit: true` (`backend/tsconfig.json`) — `npm run build` is typecheck-only, it does **not** emit a `dist/` folder. `npm start` (`node dist/server.js`) is therefore not currently usable as-is. The project always runs source `.ts` directly via `tsx`, in dev and (as far as the repo is set up today) in production too.

**Decision:** the backend Docker image (both dev and prod stages) runs the app via `tsx server.ts`, not a compiled `dist`. This matches the existing project convention (no build step, `tsx` executes TS with `.ts`-suffixed intra-project imports directly) and avoids introducing a build step that doesn't exist in the codebase today. If a real compiled build is wanted later, that's a separate, larger change to `tsconfig.json`/import extensions — out of scope here.

## Files to add

```
backend/Dockerfile
backend/.dockerignore
frontend/Dockerfile
frontend/.dockerignore
frontend/nginx.conf
docker-compose.yml          # dev stack
docker-compose.prod.yml     # prod stack (overlay/standalone, see below)
```

## backend/Dockerfile

Multi-stage, both stages just install deps and run via `tsx`:

- **Stage `dev`**: base `node:22-alpine`, `npm ci`, `CMD ["npm", "run", "dev"]` (i.e. `tsx watch server.ts`). Source is bind-mounted by compose, not copied in, so edits on host hot-reload.
- **Stage `prod`**: base `node:22-alpine`, `npm ci --omit=dev` is not viable because `tsx` is a devDependency and is the runtime — so prod stage installs full deps (`npm ci`) and `COPY . .`, `CMD ["npx", "tsx", "server.ts"]`. No compiled output, no separate build stage.

Exposes port 5000 (matches `PORT` default). `.dockerignore` excludes `node_modules`, `.env`, `dist`.

## frontend/Dockerfile

Multi-stage:

- **Stage `dev`**: `node:22-alpine`, `npm ci`, `CMD ["npm", "run", "dev", "--", "--host"]` (`--host` so Vite binds `0.0.0.0` inside the container). Source bind-mounted by compose for HMR. Exposes 5173.
- **Stage `prod`**: build stage `node:22-alpine` runs `npm ci && npm run build` (`tsc -b && vite build`) producing `dist/`; final stage `nginx:alpine` copies `dist/` to `/usr/share/nginx/html` and `frontend/nginx.conf` to `/etc/nginx/conf.d/default.conf`. Exposes 80.

`frontend/nginx.conf`: standard SPA config — `try_files $uri /index.html;` so client-side routes (react-router-dom) don't 404 on refresh.

`.dockerignore` excludes `node_modules`, `dist`, `.env`.

## docker-compose.yml (dev)

Services:
- `mongo`: official `mongo:7` image, named volume `mongo-data:/data/db`, port 27017 exposed for local inspection (e.g. Compass) — optional but harmless.
- `backend`: build `./backend` target `dev`, `env_file: backend/.env` (with `MONGO_URI` pointed at `mongodb://mongo:27017/volunteerhub` — user must update their `.env` accordingly, noted in a follow-up step, not hardcoded into compose), bind mount `./backend:/app` (with anonymous volume on `/app/node_modules` to avoid host node_modules clobbering the container's), port `5000:5000`, `depends_on: mongo`.
- `frontend`: build `./frontend` target `dev`, bind mount `./frontend:/app` + anonymous `/app/node_modules`, port `5173:5173`, `depends_on: backend`.

## docker-compose.prod.yml (prod)

Standalone compose file (not an override merge, since dev/prod diverge enough — simpler to read as its own file):
- `mongo`: same image, named volume, **not** port-published to host (only reachable on the compose network).
- `backend`: build `./backend` target `prod`, `env_file: backend/.env`, no bind mounts (image is self-contained), port `5000:5000` published (until a reverse proxy exists, this is how it's reached).
- `frontend`: build `./frontend` target `prod`, no bind mounts, port `80:80` published.

No Caddy/Traefik/TLS in this file. When a VPS is available, a follow-up will add a reverse proxy service (routing `l4mbd4.me` → frontend, `api.l4mbd4.me` → backend) and switch these two services to not publish host ports directly — that is out of scope for this spec.

## Env handling

Both compose files use `env_file:` pointing at the existing `backend/.env` / `frontend/.env` — no secrets duplicated into compose YAML or images. `MONGO_URI` in `.env` needs updating to the compose service name (`mongo`) instead of `localhost`/Atlas when running via compose; this is a one-line note for the user, not a code change.

## Testing

No test runner in the repo. Verification for this change is manual:
- `docker compose up --build` → both services reachable at `localhost:5173` (frontend, proxies API calls to `localhost:5000/api` via `VITE_API_URL`) and `localhost:5000/api` (backend), mongo auto-seeds admin/manager/volunteer users per existing `config/db.ts` behavior.
- `docker compose -f docker-compose.prod.yml up --build` → `localhost:80` serves built SPA, `localhost:5000/api` serves backend.

## Out of scope (explicitly deferred)

- Reverse proxy, HTTPS/Let's Encrypt, domain wiring for `l4mbd4.me` — deferred until a VPS exists.
- CI/CD, image registry push, k8s/orchestration.
- Compiling backend TS to real JS (`dist/`) — current `noEmit` setup is left as-is; prod runs via `tsx` same as dev.
