// backend/types/user.ts

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
    // Auth & Profile
    name: string;
    email: string;
    password?: string;
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

/**
 * @interface IAuthPayload
 */
export interface IAuthPayload {
    id: string; 
    email: string;
    role: UserRole;
}