# Deployment

Production runs on an OCI arm64 VM at <https://volunteerhub.l4mbd4.me>. Cloudflare handles DNS, TLS and proxying, and Traefik on the VM routes `/api` to the backend and everything else to the frontend. The app's containers (frontend, backend, migrate, backup and Postgres) are defined in [`docker-compose.prod.yml`](../docker-compose.prod.yml). Traefik, Grafana Alloy and Uptime Kuma are set up separately on the VM.

Postgres has no published port. Traefik never routes the backend's `/metrics`, and the app refuses that path for any request that came through a proxy.

## From commit to production

One workflow, [`ci.yml`](../.github/workflows/ci.yml), takes a push to `main` all the way to production:

1. It typechecks and builds the backend, applies the migrations to an empty Postgres service container, and runs the [behaviour checks](development.md#checks) against the real app. It lints and builds the frontend.
2. It builds the backend, frontend and backup images on a native `ubuntu-24.04-arm` runner, so they match the VM without QEMU emulation.
3. It tags each image with the full commit SHA and pushes it to GHCR, which keeps the 5 newest versions.
4. The deploy pulls; the VM never builds anything. It checks out the SHA (for the compose file only), pulls the images and restarts. A one-shot `migrate` container applies pending SQL migrations first, and the backend starts only if that succeeds.
5. A smoke test runs from the VM, through Cloudflare and Traefik, against the web root, the database-backed `/api/health` and a real API route. It checks response bodies as well as status codes.
6. If the deploy fails, it rolls back. The VM records the last SHA that passed its smoke test; a failed deploy redeploys that SHA, tests it again and marks the run red. Production recovers and the bad release still shows up as a failure.

For a manual rollback, start the workflow with `workflow_dispatch` and any SHA that GHCR still holds. Production deploys run one at a time and are never cancelled midway.

## Migrations

The app never migrates on startup. The `migrate` service applies migrations before the backend starts, and a failing migration fails the deploy.

Because a failed deploy rolls back to the previous image while the new schema stays in place, every migration must work with the previous release. A release may only expand the schema: add tables, nullable columns or columns with a default, indexes and enum values. A contracting change (dropping or renaming a column or table, adding a NOT NULL column without a default, narrowing a type, dropping an enum value) ships in a later release, once no deployed code uses the old shape. A rename therefore takes several releases: add the new column, write both and backfill, switch reads, and only then drop the old one.

`0001_users_and_push_subscriptions.sql` is the one exception. It adds `users.username` as NOT NULL without a default, which was safe only because the `users` table was an unused stub, empty in every environment. The migration carries a comment saying so.

[ADR 0001](adr/0001-move-from-mongodb-to-postgresql.md) records why the data moved from MongoDB to PostgreSQL.

## Production images

`docker-compose.prod.yml` has no `build:` blocks. The images are `ghcr.io/14m6d4/volunteerhub-{backend,frontend,backup}`, private. To pull them by hand, log in with `docker login ghcr.io` using a token that has `read:packages`, then:

```
IMAGE_TAG=<commit-sha> docker compose -f docker-compose.prod.yml up -d
```

To build a production image locally instead: `docker build --target prod ./backend`, or `docker build --target prod --build-arg VITE_API_URL=/api ./frontend`. `VITE_API_URL` is baked into the frontend bundle at build time.

The production backend runs the compiled `node dist/server.js`; `tsx` is not in the image. The same goes for the migration (`node dist/db/migrate.js`) and the seed script, where only `--append` and `--covers` may run in production (see [development](development.md#2-prepare-postgresql)).

## Production configuration

`backend/.env` on the VM holds the same keys as in development. The `postgres` container reads `POSTGRES_USER`, `POSTGRES_PASSWORD` and `POSTGRES_DB` from that file too, so they must agree with `DATABASE_URL`.

`.env.backup`, next to `docker-compose.prod.yml`, holds the object storage write key for the backup job: `OCI_S3_ENDPOINT`, `OCI_S3_REGION`, `OCI_S3_BUCKET`, `OCI_S3_ACCESS_KEY_ID` and `OCI_S3_SECRET_ACCESS_KEY`. See [operations](operations.md#backups).
