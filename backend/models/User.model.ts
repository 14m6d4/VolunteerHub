// backend/models/User.model.ts

import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import type { IUser, IUserDocument } from '../types/user.ts';
import { UserRole } from '../types/user.ts'; 



const UserSchema: Schema<IUserDocument> = new Schema<IUserDocument>({
    username: {
        type: String,
        required: true,
        trim: true,
    },
    // Optional full name / display name
    name: {
        type: String,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    passwordHash: {
        type: String,
        required: function(this: IUserDocument) {
            return this.authProvider === 'local';
        },
        select: false,
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
    
    otp: {
        type: String,
        select: false,
    },
    otpExpiresAt: {
        type: Date,
        select: false,
    },
}, {
    timestamps: true,
});

// Hash password before saving the user document
UserSchema.pre('save', async function(next) {
    // Only run if passwordHash was modified
    if (!this.isModified('passwordHash')) return; 

    // Hash the password with cost of 12
    this.passwordHash = await bcrypt.hash(this.passwordHash as string, 12);
});

//Compares the given candidate password with the stored hashed password.
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
    // Check if user has a passwordHash (e.g., local auth)
    if (!this.passwordHash) return false; 
    
    // Compare provided password with hash in DB
    return await bcrypt.compare(candidatePassword, this.passwordHash);
};

const User = mongoose.model<IUserDocument>('User', UserSchema);

export default User;