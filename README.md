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

### 2. Prepare MongoDB:

Prepare your MongoDB database (using [Atlas](https://www.mongodb.com/cloud/atlas),
or [Community](<https://github.com/benelferink/mern-template/wiki/Install-MongoDB-Community-backend-(MacOS)>)). Then configure your database within `backend/src/constants/index.js` (or `backend/src/.env`), by configuring the `MONGO_URI` variable.

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

Copy `backend/.env.example` to `backend/.env` and fill in real secrets (JWT, Google OAuth, VAPID, email, ImgBB). Set `MONGO_URI=mongodb://mongo:27017/volunteerhub` — the hostname `mongo` is the compose service name, not `localhost` and not your Atlas URI (compose runs its own Mongo container).

Create `frontend/.env`:

```
VITE_API_URL=http://localhost:5000/api
```

### 2. Dev stack (hot reload, source mounted as volumes)

```
docker compose up --build
```

Starts `mongo`, `backend` (port 5000), `frontend` (port 5173, Vite dev server). Edits to `backend/` or `frontend/src/` hot-reload without rebuilding.

**After editing `backend/.env` or `frontend/.env`, `docker compose restart <service>` is not enough** — env vars are baked in at container *creation*, not read again on restart. Recreate instead:

```
docker compose up -d --force-recreate backend
```

**Windows/CRLF gotcha:** if `backend/.env` was edited with a Windows editor, stray `\r` line endings can make Docker's `env_file` parser resolve the wrong (commented-out) value for a duplicated key like `MONGO_URI`. If a var isn't what you expect, check inside the container: `docker compose exec backend sh -c 'echo $MONGO_URI'`.

### 3. Restoring a data backup (e.g. an Atlas `mongodump`)

```
docker cp path/to/dump/<source-db> volunteerhub-dev-mongo-1:/tmp/dump/<source-db>
docker exec volunteerhub-dev-mongo-1 mongorestore --nsFrom='<source-db>.*' --nsTo='volunteerhub.*' --drop /tmp/dump
docker exec volunteerhub-dev-mongo-1 rm -rf /tmp/dump
```

`--nsFrom`/`--nsTo` remaps the dump's database name to `volunteerhub` (matching `MONGO_URI` above) if they differ. This data lives in the `mongo-data` Docker volume — `docker compose down -v` deletes it; re-run the restore after.

### 4. Production images

`docker-compose.prod.yml` has no `build:` blocks. CI builds arm64 images on every push to `main`, tags them with the commit SHA and pushes them to GHCR (`ghcr.io/14m6d4/volunteerhub-{backend,frontend}`, private, 5 most recent kept). The deploy pulls them on the VM. Pulling by hand needs `docker login ghcr.io` with a token that has `read:packages`:

```
IMAGE_TAG=<commit-sha> docker compose -f docker-compose.prod.yml up -d
```

To build a prod image locally instead: `docker build --target prod ./backend`, or `docker build --target prod --build-arg VITE_API_URL=/api ./frontend`. `VITE_API_URL` is baked into the frontend bundle at build time.