import mongoose from "mongoose";
import { sql } from 'drizzle-orm';
import { db } from '../db/client.ts';
import { seedAdminUser } from '../services/user.service.ts';
import dotenv from "dotenv";
dotenv.config();

if (!process.env.MONGO_URI) {
    console.error("MONGO_URI hasn't been defined.");
    process.exit(1);
}

const options = {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
};

const MONGO_URI: string = process.env.MONGO_URI;

export const connectDB = async () => {
    try {
        const conn = await mongoose.connect(MONGO_URI, options);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        await db.execute(sql`select 1`); // fail at boot, not on the first login, if DATABASE_URL is wrong
        await seedAdminUser();
    } catch (err) {
        if (err instanceof Error) {
            console.error(`Error: ${err.message}`);
            process.exit(1);
        }
    }
};

export const disconnectDB = async () => {
    console.log('Disconnecte DB');
    await mongoose.connection.close();
}