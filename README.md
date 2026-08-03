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

1. Copy `backend/.env.example` to `backend/.env` and fill in real secrets (Mongo, JWT, Google OAuth, VAPID, email, ImgBB).
2. Start the dev stack (hot reload, source mounted as volumes):

```
docker compose up --build
```

This starts `mongo`, `backend` (port 5000), and `frontend` (port 5173).

For a production-like build (nginx-served frontend, compiled backend):

```
docker compose -f docker-compose.prod.yml up --build
```

Set `VITE_API_URL` in your shell/`.env` before building the prod frontend if the API isn't reachable at `http://localhost:5000/api` (e.g. a real domain) — it's baked into the frontend bundle at build time.