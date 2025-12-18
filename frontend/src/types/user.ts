// frontend/src/types/user.ts

export enum UserRole {
  Volunteer = 'volunteer',
  Manager = 'manager',
  Admin = 'admin',
}

export interface User {
  _id: string;
  username: string;
  name?: string;
  email: string;
  birthdate: string; // ISO string
  role: UserRole;
  profilePicture?: string;
  notificationsEnabled: boolean;
  notifyOnMention: boolean;
  notifyOnEventUpdate: boolean;
  createdAt: string;
  updatedAt: string;
}

export type UpdateProfilePayload = {
  username?: string;
  name?: string;
  birthdate?: string;
  profilePicture?: string;
  notificationsEnabled?: boolean;
  notifyOnMention?: boolean;
  notifyOnEventUpdate?: boolean;
  currentPassword?: string;
  authProvider?: string;
};

export interface PublicUserProfile {
  username: string;
  name?: string;
  birthdate: string; // ISO string, sẽ format lại ở UI
  profilePicture?: string;
  role: UserRole;
  createdAt: string;
}