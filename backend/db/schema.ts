import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// Deliberately tiny: just enough to prove the migration machinery.
// The full schema arrives with the data-layer rewrite.
export const userRole = pgEnum("user_role", ["volunteer", "manager", "admin"]);

export const users = pgTable("users", {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull().unique(),
    role: userRole("role").notNull().default("volunteer"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
