import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.ts";

// postgres.js connects on first query, so importing this never needs a database.
// config/db.ts pings it at boot so a bad DATABASE_URL fails there.
const client = postgres(process.env.DATABASE_URL ?? "");

export const db = drizzle(client, { schema });
export const closeDb = () => client.end();
