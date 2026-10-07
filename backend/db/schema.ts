import { sql } from "drizzle-orm";
import { boolean, check, date, index, integer, pgEnum, pgTable, primaryKey, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["volunteer", "manager", "admin"]);
export const eventStatus = pgEnum("event_status", ["draft", "pending", "approved", "cancelled", "finished"]);
export const registrationStatus = pgEnum("registration_status", ["pending", "approved", "rejected", "cancelled", "completed"]);
export const authProvider = pgEnum("auth_provider", ["local", "google"]);
export const friendRequestStatus = pgEnum("friend_request_status", ["pending", "accepted", "declined"]);

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

// A post's pinned flag lives on the post itself, so events carry no pinned_post_id.
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

// One discussion per event; it goes with the event.
export const discussions = pgTable("discussions", {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id").notNull().unique().references(() => events.id, { onDelete: "cascade" }),
    locked: boolean("locked").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// A post belongs to an event, a discussion, or (as before) neither; either parent takes its posts with it.
export const posts = pgTable("posts", {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id").references(() => events.id, { onDelete: "cascade" }),
    discussionId: uuid("discussion_id").references(() => discussions.id, { onDelete: "cascade" }),
    authorId: uuid("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    content: text("content"),
    // ImgBB URL.
    image: text("image"),
    pinned: boolean("pinned").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
    index("posts_event_id_created_at_idx").on(t.eventId, t.createdAt),
    index("posts_discussion_id_idx").on(t.discussionId),
    index("posts_author_id_idx").on(t.authorId),
]);

// createdAt keeps the order in which people liked, which is the order the API lists them in.
export const postLikes = pgTable("post_likes", {
    postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
    primaryKey({ columns: [t.postId, t.userId] }),
    index("post_likes_user_id_idx").on(t.userId),
]);

export const comments = pgTable("comments", {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
    authorId: uuid("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
    index("comments_post_id_created_at_idx").on(t.postId, t.createdAt),
    index("comments_author_id_idx").on(t.authorId),
]);

export const commentLikes = pgTable("comment_likes", {
    commentId: uuid("comment_id").notNull().references(() => comments.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
    primaryKey({ columns: [t.commentId, t.userId] }),
    index("comment_likes_user_id_idx").on(t.userId),
]);

// One request per direction; a declined or accepted one is replaced when sent again.
export const friendRequests = pgTable("friend_requests", {
    id: uuid("id").primaryKey().defaultRandom(),
    senderId: uuid("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    receiverId: uuid("receiver_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    status: friendRequestStatus("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
    unique("friend_requests_sender_receiver_unique").on(t.senderId, t.receiverId),
    check("friend_requests_not_self_check", sql`${t.senderId} <> ${t.receiverId}`),
    index("friend_requests_receiver_id_idx").on(t.receiverId),
]);

// One row per pair, smaller id first, so "A and B are friends" has a single spelling.
export const friendships = pgTable("friendships", {
    userLow: uuid("user_low").notNull().references(() => users.id, { onDelete: "cascade" }),
    userHigh: uuid("user_high").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
    primaryKey({ columns: [t.userLow, t.userHigh] }),
    check("friendships_ordered_check", sql`${t.userLow} < ${t.userHigh}`),
    index("friendships_user_high_idx").on(t.userHigh),
]);
