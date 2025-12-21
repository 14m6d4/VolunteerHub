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
        const ADMIN_EMAIL = '23021521@vnu.edu.vn';
        const ADMIN_PASSWORD = '11111111';
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
            name: 'Nguyễn Tiến Đạt Admin',
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
            name: 'Nguyễn Quang Dũng Admin',
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
            name: 'Phạm Hoàng An Khánh admin',
            birthdate: new Date('1990-01-01'),
            role: UserRole.Admin,
            isVerified: true,
            isActive: true,
            authProvider: 'local',
        });

        await User.create({
            username: 'manager1',
            email: 'ankhanh@gmail.com',
            passwordHash: '11111111',
            name: 'Khánh Phạm',
            birthdate: new Date('1995-06-15'),
            role: UserRole.Manager,
            isVerified: true,
            isActive: true,
            authProvider: 'local',
        });

        await User.create({
            username: 'tiendatnguyen',
            email: 'tiendat@gmail.com',
            passwordHash: '11111111',
            name: 'Đạt Nguyễn',
            birthdate: new Date('1995-06-15'),
            role: UserRole.Volunteer,
            isVerified: true,
            isActive: true,
            authProvider: 'local',
        })

        console.log('Initial users created successfully.');
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