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
    ssl: true, 
    serverSelectionTimeoutMS: 5000, 
    socketTimeoutMS: 45000, 
};

const MONGO_URI: string = process.env.MONGO_URI;

/**
 * @function seedAdminUser
 * @description Checks if a default Admin user exists and creates one if not.
 */
const seedAdminUser = async (): Promise<void> => {
    try {
        const ADMIN_EMAIL = '23021521@vnu.edu.vn';
        const ADMIN_PASSWORD = '111111'; // 111111
        const BIRTHDATE = new Date('1990-01-01');
        
        const adminExists = await User.findOne({ role: UserRole.Admin });

        if (adminExists) {
            console.log('Admin users already exists. Seeding skipped.');
            return;
        }

        await User.create({
            username: 'admindat',
            email: ADMIN_EMAIL,
            passwordHash: ADMIN_PASSWORD,
            birthdate: BIRTHDATE,
            role: UserRole.Admin,
            isVerified: true,
            isActive: true,
            authProvider: 'local',
        });

        await User.create({
            username: 'admindung',
            email: '23021497@vnu.edu.vn',
            passwordHash: ADMIN_PASSWORD,
            birthdate: new Date('1990-01-01'),
            role: UserRole.Admin,
            isVerified: true,
            isActive: true,
            authProvider: 'local',
        });

        await User.create({
            username: 'adminkhanh',
            email: '23021597@vnu.edu.vn',
            passwordHash: ADMIN_PASSWORD,
            birthdate: new Date('1990-01-01'),
            role: UserRole.Admin,
            isVerified: true,
            isActive: true,
            authProvider: 'local',
        });

        console.log('Initial Admin users created successfully.');
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