import { sql } from 'drizzle-orm';
import { db } from '../db/client.ts';
import { seedAdminUser } from '../services/user.service.ts';
import dotenv from "dotenv";
dotenv.config();

export const connectDB = async () => {
    try {
        await db.execute(sql`select 1`); // fail at boot, not on the first login, if DATABASE_URL is wrong
        console.log("PostgreSQL connected");
        await seedAdminUser();
    } catch (err) {
        if (err instanceof Error) {
            console.error(`Error: ${err.message}`);
            process.exit(1);
        }
    }
};
