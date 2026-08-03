# Docker Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Docker support to VolunteerHub — a dev compose stack (mongo + backend + frontend, hot reload) and a prod compose stack (built images, plain published ports, no reverse proxy yet).

**Architecture:** Backend and frontend each get a multi-stage `Dockerfile` (`dev` stage for hot-reload dev server, `prod` stage for the production artifact). Two compose files at repo root wire them together with mongo. Backend runs via `tsx` in both stages — `backend/tsconfig.json` has `noEmit: true`, so there is no compiled `dist/` to run; `npm start`/`node dist/server.js` is not usable as-is and is not used here.

**Tech Stack:** Docker, Docker Compose v2, `node:22-alpine`, `nginx:alpine`, `mongo:7`.

This is infrastructure config, not application code — there is no unit-test framework to drive TDD here. Each task's "test" step is a concrete `docker build`/`docker compose` command with an expected observable result (container starts, port responds, page/API loads). Follow the steps as written; do not skip the verification command.

## Global Constraints

- Backend prod stage MUST run via `tsx server.ts`, never `node dist/server.js` — confirmed in spec: `noEmit: true` in `backend/tsconfig.json` means no `dist/` is emitted.
- No reverse proxy, no TLS, no domain wiring for `l4mbd4.me`, no CI/CD — explicitly out of scope per spec `docs/superpowers/specs/2026-08-03-docker-integration-design.md`.
- No secrets in compose YAML or images — always `env_file:` pointing at existing `backend/.env` / `frontend/.env`.
- Intra-project backend TS imports require explicit `.ts` extension (existing project convention) — irrelevant to Docker files themselves, but don't touch source files to "fix" this.

---

### Task 1: Backend Dockerfile

**Files:**
- Create: `backend/Dockerfile`
- Create: `backend/.dockerignore`

**Interfaces:**
- Produces: image buildable with `docker build --target dev -t volunteerhub-backend:dev ./backend` and `docker build --target prod -t volunteerhub-backend:prod ./backend`. Both stages listen on port 5000 (Express default from `backend/.env` `PORT`).

- [ ] **Step 1: Write `backend/.dockerignore`**

```
node_modules
npm-debug.log
.env
dist
.git
```

- [ ] **Step 2: Write `backend/Dockerfile`**

```dockerfile
FROM node:22-alpine AS base
WORKDIR /app
COPY package*.json ./

FROM base AS dev
RUN npm ci
COPY . .
EXPOSE 5000
CMD ["npm", "run", "dev"]

FROM base AS prod
RUN npm ci
COPY . .
EXPOSE 5000
CMD ["npx", "tsx", "server.ts"]
```

- [ ] **Step 3: Build the dev stage and verify it starts**

Run: `docker build --target dev -t volunteerhub-backend:dev ./backend`
Expected: build succeeds (no errors).

Run: `docker run --rm -e MONGO_URI=mongodb://host.docker.internal:27017/test -e PORT=5000 -e JWT_SECRET=test -p 5000:5000 volunteerhub-backend:dev`
Expected: log output showing `tsx watch` starting the server (e.g. "Server running on port 5000" or equivalent from `server.ts`). Ctrl+C to stop — a real Mongo connection isn't required for this smoke check, just that the process boots and doesn't crash on missing files/imports.

- [ ] **Step 4: Build the prod stage and verify it starts**

Run: `docker build --target prod -t volunteerhub-backend:prod ./backend`
Expected: build succeeds.

Run: `docker run --rm -e MONGO_URI=mongodb://host.docker.internal:27017/test -e PORT=5000 -e JWT_SECRET=test -p 5000:5000 volunteerhub-backend:prod`
Expected: same boot behavior as dev stage (runs via `tsx`, no `dist` involved). Ctrl+C to stop.

- [ ] **Step 5: Commit**

```bash
git add backend/Dockerfile backend/.dockerignore
git commit -m "Add backend Dockerfile (dev/prod stages via tsx)"
```

---

### Task 2: Frontend Dockerfile + nginx config

**Files:**
- Create: `frontend/Dockerfile`
- Create: `frontend/.dockerignore`
- Create: `frontend/nginx.conf`

**Interfaces:**
- Produces: image buildable with `docker build --target dev -t volunteerhub-frontend:dev ./frontend` (serves Vite dev server on 5173) and `docker build --target prod -t volunteerhub-frontend:prod ./frontend` (serves built static SPA via nginx on port 80).

- [ ] **Step 1: Write `frontend/.dockerignore`**

```
node_modules
dist
.env
.git
```

- [ ] **Step 2: Write `frontend/nginx.conf`**

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

- [ ] **Step 3: Write `frontend/Dockerfile`**

```dockerfile
FROM node:22-alpine AS base
WORKDIR /app
COPY package*.json ./

FROM base AS dev
RUN npm ci
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]

FROM base AS build
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine AS prod
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

- [ ] **Step 4: Build the dev stage and verify it serves**

Run: `docker build --target dev -t volunteerhub-frontend:dev ./frontend`
Expected: build succeeds.

Run: `docker run --rm -p 5173:5173 volunteerhub-frontend:dev`
Expected: Vite dev server log ("Local:", "Network:") printed. Visit `http://localhost:5173` in browser — page loads (API calls will fail without backend running, that's fine for this check). Ctrl+C to stop.

- [ ] **Step 5: Build the prod stage and verify it serves**

Run: `docker build --target prod -t volunteerhub-frontend:prod ./frontend`
Expected: build succeeds (build stage runs `tsc -b && vite build` without TS errors).

Run: `docker run --rm -p 8080:80 volunteerhub-frontend:prod`
Expected: `curl -I http://localhost:8080` returns `HTTP/1.1 200 OK` and serves `index.html`. Ctrl+C to stop.

- [ ] **Step 6: Commit**

```bash
git add frontend/Dockerfile frontend/.dockerignore frontend/nginx.conf
git commit -m "Add frontend Dockerfile (dev Vite server / prod nginx static)"
```

---

### Task 3: Dev compose stack

**Files:**
- Create: `docker-compose.yml`

**Interfaces:**
- Consumes: `backend/Dockerfile` dev stage (Task 1), `frontend/Dockerfile` dev stage (Task 2).
- Produces: `docker compose up --build` boots mongo on `mongo:27017` (internal) and `localhost:27017` (host), backend on `localhost:5000`, frontend on `localhost:5173`.

- [ ] **Step 1: Write `docker-compose.yml`**

```yaml
services:
  mongo:
    image: mongo:7
    restart: unless-stopped
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db

  backend:
    build:
      context: ./backend
      target: dev
    env_file:
      - ./backend/.env
    ports:
      - "5000:5000"
    volumes:
      - ./backend:/app
      - /app/node_modules
    depends_on:
      - mongo

  frontend:
    build:
      context: ./frontend
      target: dev
    env_file:
      - ./frontend/.env
    ports:
      - "5173:5173"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    depends_on:
      - backend

volumes:
  mongo-data:
```

- [ ] **Step 2: Update `backend/.env` `MONGO_URI` to point at the compose service name**

Open `backend/.env`, change `MONGO_URI` to `mongodb://mongo:27017/volunteerhub` (service name `mongo`, not `localhost`) so the backend container can reach the mongo container. This only takes effect when running via compose — running `npm run dev` directly on the host still needs a locally reachable Mongo, so keep a comment noting the swap if the user runs both ways.

- [ ] **Step 3: Bring up the stack and verify end-to-end**

Run: `docker compose up --build`
Expected: three containers start; backend log shows successful Mongo connection and auto-seed (per existing `config/db.ts` behavior — admin/manager/volunteer users created since it's a fresh DB); frontend log shows Vite ready.

Run (separate terminal): `curl http://localhost:5000/api/health` or any known public GET route (check `backend/routes/*.routes.ts` for an unauthenticated route to hit) — expect JSON `{ success: true, ... }`.

Visit `http://localhost:5173` in browser — app loads, login page reachable.

Run: `docker compose down` to stop. Data persists in the `mongo-data` named volume across restarts (`docker compose up` again without `-v`).

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml backend/.env
git commit -m "Add dev docker-compose stack (mongo + backend + frontend)"
```

Note: `backend/.env` is normally gitignored (it holds secrets). Check `git status` before this commit — if `.env` is ignored, this command will only stage `docker-compose.yml`; that's correct, just update the file locally without committing it.

---

### Task 4: Prod compose stack

**Files:**
- Create: `docker-compose.prod.yml`

**Interfaces:**
- Consumes: `backend/Dockerfile` prod stage (Task 1), `frontend/Dockerfile` prod stage (Task 2).
- Produces: `docker compose -f docker-compose.prod.yml up --build` boots mongo (internal-only), backend on `localhost:5000`, frontend (nginx) on `localhost:80`.

- [ ] **Step 1: Write `docker-compose.prod.yml`**

```yaml
services:
  mongo:
    image: mongo:7
    restart: unless-stopped
    volumes:
      - mongo-data:/data/db

  backend:
    build:
      context: ./backend
      target: prod
    env_file:
      - ./backend/.env
    ports:
      - "5000:5000"
    restart: unless-stopped
    depends_on:
      - mongo

  frontend:
    build:
      context: ./frontend
      target: prod
    ports:
      - "80:80"
    restart: unless-stopped
    depends_on:
      - backend

volumes:
  mongo-data:
```

- [ ] **Step 2: Bring up the prod stack and verify**

Run: `docker compose -f docker-compose.prod.yml up --build`
Expected: three containers start, no bind mounts (each image is self-contained — editing host files does nothing until rebuilt).

Run: `curl -I http://localhost:80` → expect `200 OK` (nginx serving built SPA).
Run: `curl http://localhost:5000/api/<a known public route>` → expect JSON response.

Run: `docker compose -f docker-compose.prod.yml down` to stop.

- [ ] **Step 3: Commit**

```bash
git add docker-compose.prod.yml
git commit -m "Add prod docker-compose stack"
```

---

## Self-Review Notes

- Spec coverage: dev stack (Task 3), prod stack (Task 4), backend Dockerfile w/ tsx-not-dist decision (Task 1), frontend Dockerfile w/ nginx (Task 2), `.dockerignore` both packages (Tasks 1–2), env_file usage (Tasks 3–4), reverse proxy/TLS explicitly left out (noted in Global Constraints) — all spec sections covered.
- No placeholders — every step has concrete file content or a runnable command with expected output.
- Type/name consistency: compose service name `mongo` matches the `MONGO_URI` value backend expects; `target: dev`/`target: prod` match stage names in both Dockerfiles; port numbers (5000, 5173, 80, 27017) consistent across all four tasks.
