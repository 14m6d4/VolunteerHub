

export const UserRole = {
  Volunteer: 'volunteer',
  Manager: 'manager',
  Admin: 'admin',
} as const;
export type UserRole = typeof UserRole[keyof typeof UserRole];

export interface User {
  _id: string;
  username: string;
  name?: string;
  email: string;
  birthdate: string;
  role: UserRole;
  profilePicture?: string;
  notificationsEnabled: boolean;
  notifyOnMention: boolean;
  notifyOnEventUpdate: boolean;
  authProvider?: string;
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
  password?: string;
  authProvider?: string;
};

export interface PublicUserProfile {
  _id?: string;
  id?: string;
  username: string;
  name?: string;
  birthdate: string;
  profilePicture?: string;
  role: UserRole;
  createdAt: string;
}