import { eq } from "drizzle-orm";
import { db } from "../db/client.ts";
import { discussions } from "../db/schema.ts";
import createHttpError from "http-errors";
import { getEventRow } from "../utils/event.util.ts";
import { isUniqueViolation, isUuid, toLean } from "../utils/user.util.ts";
import { PostService } from "./post.service.ts";

type DiscussionRow = typeof discussions.$inferSelect;

const setLocked = async (discussionId: string, locked: boolean) => {
    if (!isUuid(discussionId)) return null;
    const [row] = await db.update(discussions).set({ locked, updatedAt: new Date() })
        .where(eq(discussions.id, discussionId)).returning();
    return row ? toLean(row) : null;
};

export const DiscussionService = {
    async createDiscussion(eventId: string) {
        if (!(await getEventRow(eventId))) throw createHttpError(404, "Event not found");
        try {
            const [row] = await db.insert(discussions).values({ eventId }).returning();
            return toLean(row as DiscussionRow);
        } catch (err) {
            if (isUniqueViolation(err)) throw createHttpError(400, "Discussion already exists");
            throw err;
        }
    },

    async getByEventId(eventId: string) {
        if (!isUuid(eventId)) return null;
        const [row] = await db.select().from(discussions).where(eq(discussions.eventId, eventId));
        return row ? toLean(row) : null;
    },

    async getById(discussionId: string) {
        if (!isUuid(discussionId)) return null;
        const [row] = await db.select().from(discussions).where(eq(discussions.id, discussionId));
        return row ? toLean(row) : null;
    },

    lockDiscussion(discussionId: string) {
        return setLocked(discussionId, true);
    },

    unlockDiscussion(discussionId: string) {
        return setLocked(discussionId, false);
    },

    async getDiscussionPosts(discussionId: string) {
        const found = await PostService.getPostsByDiscussion(discussionId);
        return found.map((post) => ({ ...post, attachments: [] }));
    },
};
