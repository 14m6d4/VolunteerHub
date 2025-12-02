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
    // Optional full/display name
    name?: string;
    email: string;
    passwordHash?: string;
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

    //OTP
    otp?: string | null | undefined;
    otpExpiresAt?: Date | null | undefined;

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

export interface IRegisterDTO {
  username: string;
  email: string;
  password: string;
  birthdate: Date;
  name?: string;
  role?: UserRole;
}

export type UpdateProfileData = {
  username?: string;
  birthdate?: Date;
  profilePicture?: string;
  notificationsEnabled?: boolean;
  notifyOnMention?: boolean;
  notifyOnEventUpdate?: boolean;
  name?: string;
  // email, role, authProvider not allowed here
};