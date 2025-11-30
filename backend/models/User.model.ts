// backend/models/User.model.ts

import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import type { IUser } from '../types/user.ts';
import { UserRole } from '../types/user.ts'; 

// Extend Document with custom methods
interface IUserDocument extends IUser, Document {
    comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema: Schema<IUserDocument> = new Schema<IUserDocument>({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: function(this: IUserDocument) {
            return this.authProvider === 'local';
        },
        select: false, // Don't return by default
    },
    birthdate: {
        type: Date,
        required: true,
    },
    role: {
        type: String,
        enum: Object.values(UserRole),
        default: UserRole.Volunteer, 
        required: true,
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    authProvider: {
        type: String,
        enum: ['local', 'google'],
        default: 'local',
        required: true,
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true,
    },
    profilePicture: {
        type: String,
    },
    friends: [
        {
            type: Schema.Types.ObjectId,
            ref: 'User',
        }
    ],
    // Notification Preferences
    notificationsEnabled: {
        type: Boolean,
        default: true,
    },
    notifyOnMention: {
        type: Boolean,
        default: true,
    },
    notifyOnEventUpdate: {
        type: Boolean,
        default: true,
    },
}, {
    timestamps: true,
});