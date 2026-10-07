import { sql } from "drizzle-orm";
import { boolean, check, date, index, integer, pgEnum, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["volunteer", "manager", "admin"]);
export const eventStatus = pgEnum("event_status", ["draft", "pending", "approved", "cancelled", "finished"]);
export const registrationStatus = pgEnum("registration_status", ["pending", "approved", "rejected", "cancelled", "completed"]);
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

// pinned_post_id arrives with the posts table (ticket 09), where it can be a real foreign key.
export const events = pgTable("events", {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    location: text("location").notNull().default(""),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }),
    // Null means unlimited.
    maxMembers: integer("max_members"),
    currentMembers: integer("current_members").notNull().default(0),
    status: eventStatus("status").notNull().default("pending"),
    isPublic: boolean("is_public").notNull().default(true),
    // Deleting a manager takes their events (and, through them, the registrations) with it.
    managerId: uuid("manager_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    image: text("image").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
    check("events_current_members_check", sql`${t.currentMembers} >= 0`),
    // The listing filters by status and manager and sorts by start date; tags is an any-of lookup.
    index("events_status_start_at_idx").on(t.status, t.startAt),
    index("events_start_at_idx").on(t.startAt),
    index("events_manager_id_idx").on(t.managerId),
    index("events_tags_idx").using("gin", t.tags),
]);

export const registrations = pgTable("registrations", {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    volunteerId: uuid("volunteer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    status: registrationStatus("status").notNull().default("pending"),
    note: text("note").notNull().default(""),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
    // One registration per volunteer per event; its index also serves "who is in this event".
    unique("registrations_event_volunteer_unique").on(t.eventId, t.volunteerId),
    index("registrations_volunteer_id_idx").on(t.volunteerId),
]);
