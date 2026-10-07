// One-shot: applies pending SQL migrations from ./drizzle, then exits.
// Compiled to dist/db/migrate.js and run by the `migrate` compose service.
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
    console.error("DATABASE_URL hasn't been defined.");
    process.exit(1);
}

// max: 1 is what drizzle recommends for migrations.
const client = postgres(url, { max: 1 });
try {
    // Relative to the working directory: backend/ in dev and CI, /app in the image.
    await migrate(drizzle(client), { migrationsFolder: "drizzle" });
    console.log("migrations applied");
} finally {
    await client.end();
}
