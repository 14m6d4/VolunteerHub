# 0001. Move from MongoDB to PostgreSQL

Status: accepted

## Context

VolunteerHub stores its data in MongoDB through Mongoose. The data is relational: users, events, registrations, posts, comments, notifications and friend requests all point at each other. In MongoDB those links are plain ObjectId references that nothing enforces, so integrity (no orphaned registrations, no duplicate friend requests, no invalid status values) depends on application code and TypeScript-only enums.

The project is also the maintainer's vehicle for learning DevOps. Relational modelling, SQL and versioned schema migrations are skills worth practising on a real deployment.

## Decision

Move the data layer to PostgreSQL, managed with Drizzle (schema in TypeScript, migrations generated as plain SQL and committed). Postgres 17 runs as a container in the production stack with a named volume.

The move is split into expand and contract so production never breaks:

1. **Expand**: Postgres and the migration machinery run in production next to MongoDB. The app still uses MongoDB only.
2. **Cutover**: services are rewritten against Postgres (controllers and response contracts unchanged) and the database is reseeded from scratch. Existing data is discarded, not migrated.
3. **Contract**: MongoDB, Mongoose and their compose service are removed once the cutover is verified.

Schema changes follow the expand/contract rule in `CLAUDE.md`, so an automatic image rollback keeps working against a migrated database.

## Consequences

- Foreign keys, unique constraints and enums enforce integrity in the database instead of in app code.
- Schema changes become reviewable SQL in pull requests, applied by a one-shot `migrate` step before the backend starts.
- Two databases run side by side until the cutover, and the services layer needs a full rewrite.
- The maintainer takes on operating Postgres: upgrades, backups and restore checks.
