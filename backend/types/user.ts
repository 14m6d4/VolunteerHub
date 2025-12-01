// backend/types/user.ts
import { type ObjectId } from 'mongoose';

/**
 * @enum UserRole
 */
export enum UserRole {
    Volunteer = 'volunteer',
    Manager = 'manager',
    Admin = 'admin',
}

/**
 * @interface IUser
 */
export interface IUser {
    _id: ObjectId;
    // Auth & Profile
    username: string;
    email: string;
    passwordHash: string;
    birthdate: Date;
    role: UserRole;
    
    // Status
    isVerified: boolean;
    isActive: boolean;

    // Auth Provider
    authProvider: 'local' | 'google';
    googleId?: string; 
    profilePicture?: string;
    
    // Social
    friends?: string[]; 

    // Notification Prefs
    notificationsEnabled: boolean;
    notifyOnMention: boolean;
    notifyOnEventUpdate: boolean;

    // Timestamps
    createdAt: Date;
    updatedAt: Date;
}

export interface IUserDocument extends IUser, Document {
    comparePassword: (candidatePassword: string) => Promise<boolean>;
}

/**
 * @interface ITokenPayload
 * Data encoded inside the JWT (used for authentication).
 */
export interface ITokenPayload {
    id: string; 
    email: string;
    role: UserRole;
}

export interface ILoginDTO {
  email?: string;
  username?: string;
  password: string;
}