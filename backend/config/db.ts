import mongoose from "mongoose";
import User from '../models/User.model.ts';
import { UserRole } from '../types/user.ts';
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

const seedAdminUser = async (): Promise<void> => {
    try {
        const { SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD } = process.env;

        if (!SEED_ADMIN_EMAIL || !SEED_ADMIN_PASSWORD) {
            console.log('SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD not set. Admin seeding skipped.');
            return;
        }

        const adminExists = await User.findOne({ role: UserRole.Admin });

        if (adminExists) {
            console.log('Admin user already exists. Seeding skipped.');
            return;
        }

        await User.create({
            username: SEED_ADMIN_EMAIL.split('@')[0] || 'admin',
            email: SEED_ADMIN_EMAIL,
            passwordHash: SEED_ADMIN_PASSWORD,
            name: 'Administrator',
            birthdate: new Date('1990-01-01'),
            role: UserRole.Admin,
            isVerified: true,
            isActive: true,
            authProvider: 'local',
        });

        console.log(`Admin user seeded: ${SEED_ADMIN_EMAIL}`);
    } catch (error) {
        console.error('Error seeding Admin user:', error);
    }
};

export const connectDB = async () => {
    try {
        const conn = await mongoose.connect(MONGO_URI, options);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
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