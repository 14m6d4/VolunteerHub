import { boolean, date, index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["volunteer", "manager", "admin"]);
export const authProvider = pgEnum("auth_provider", ["local", "google"]);

export const users = pgTable("users", {
    id: uuid("id").primaryKey().defaultRandom(),
    username: text("username").notNull().unique(),
    name: text("name"),
    email: text("email").notNull().unique(),
    // Null for Google accounts, which never have a password.
    passwordHash: text("password_hash"),
    birthdate: date("birthdate", { mode: "date" }),
    role: userRole("role").notNull().default("volunteer"),
    isVerified: boolean("is_verified").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    authProvider: authProvider("auth_provider").notNull().default("local"),
    // Unique, and NULLs don't collide, so local accounts can all leave it empty.
    googleId: text("google_id").unique(),
    profilePicture: text("profile_picture"),
    notificationsEnabled: boolean("notifications_enabled").notNull().default(true),
    notifyOnMention: boolean("notify_on_mention").notNull().default(true),
    notifyOnEventUpdate: boolean("notify_on_event_update").notNull().default(true),
    isBanned: boolean("is_banned").notNull().default(false),
    bannedReason: text("banned_reason"),
    bannedUntil: timestamp("banned_until", { withTimezone: true }),
    otp: text("otp"),
    otpExpiresAt: timestamp("otp_expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pushSubscriptions = pgTable("push_subscriptions", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh"),
    auth: text("auth"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("push_subscriptions_user_id_idx").on(t.userId)]);
