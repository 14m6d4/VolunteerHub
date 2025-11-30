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