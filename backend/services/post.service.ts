import { and, asc, desc, eq, type SQL } from "drizzle-orm";
import createHttpError from "http-errors";
import { db } from "../db/client.ts";
import { discussions, postLikes, posts, users } from "../db/schema.ts";
import { deleteImages, saveImage } from "./image.service.ts";
import { ModerationService } from "./moderation.service.ts";
import { notify } from "./notification.service.ts";
import { NotificationType } from "../types/notification.ts";
import { getEventRow } from "../utils/event.util.ts";
import { getPostRow, postLikerIds, postLikers, toPost } from "../utils/post.util.ts";
import { isUuid, toLean } from "../utils/user.util.ts";

const AUTHOR = { id: users.id, name: users.name, username: users.username, profilePicture: users.profilePicture };
const AUTHOR_WITH_CONTACT = { ...AUTHOR, email: users.email, role: users.role };

/** Pinned first, then newest; the author and the likers are populated. */
async function listPosts(where: SQL, withContact = false) {
    const authorColumns = (withContact ? AUTHOR_WITH_CONTACT : AUTHOR) as typeof AUTHOR_WITH_CONTACT;
    const rows = await db.select({ post: posts, author: authorColumns }).from(posts)
        .innerJoin(users, eq(users.id, posts.authorId))
        .where(where)
        .orderBy(desc(posts.pinned), desc(posts.createdAt), asc(posts.id));
    const likers = await postLikers(rows.map((r) => r.post.id));
    return rows.map(({ post, author }) => ({
        ...toPost(post, likers.get(post.id) ?? []),
        authorId: toLean(author),
    }));
}

const withLikeIds = async (row: typeof posts.$inferSelect) =>
    toPost(row, (await postLikerIds([row.id])).get(row.id) ?? []);

export const PostService = {
    async createPost({ userId, discussionId, eventId, content, file }: { userId: string, discussionId?: string, eventId?: string, content?: string, file?: Express.Multer.File }) {
        if (!content && !file) throw createHttpError(400, "Post must contain either text or image.");

        if (eventId && !(await getEventRow(eventId))) throw createHttpError(404, "Event not found");
        if (discussionId) {
            const [discussion] = isUuid(discussionId)
                ? await db.select({ id: discussions.id }).from(discussions).where(eq(discussions.id, discussionId))
                : [];
            if (!discussion) throw createHttpError(404, "Discussion not found");
        }

        const image = file ? await saveImage(file.buffer) : undefined;

        try {
            const [post] = await db.insert(posts).values({
                discussionId: discussionId || null,
                eventId: eventId || null,
                authorId: userId,
                content: content ?? null,
                image: image ?? null,
            }).returning();
            return toPost(post!, []);
        } catch (err) {
            await deleteImages(image);
            throw err;
        }
    },

    async getPostsByDiscussion(discussionId: string) {
        if (!isUuid(discussionId)) return [];
        return listPosts(eq(posts.discussionId, discussionId));
    },

    async getPostsByEvent(eventId: string) {
        if (!isUuid(eventId)) return [];
        return listPosts(eq(posts.eventId, eventId), true);
    },

    async likePost(userId: string, postId: string) {
        const post = await getPostRow(postId);
        if (!post) throw createHttpError(404, "Post not found");

        // Liking again takes the like back; the primary key keeps a double click from liking twice.
        const removed = await db.delete(postLikes)
            .where(and(eq(postLikes.postId, post.id), eq(postLikes.userId, userId)))
            .returning({ userId: postLikes.userId });
        const isLiked = removed.length > 0;
        if (!isLiked) await db.insert(postLikes).values({ postId: post.id, userId }).onConflictDoNothing();

        if (!isLiked) {
            // Notification work never fails the like: no name, no notification.
            const [liker] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId)).catch(() => []);
            if (liker) await notify({ userId: post.authorId }, NotificationType.POST_LIKED,
                { postId, userId, actorName: liker.name, eventId: post.eventId }, userId);
        }

        return withLikeIds(post);
    },

    async deletePost(postId: string, userId: string, role: string) {
        const post = await getPostRow(postId);
        if (!post) throw createHttpError(404, "Post not found");

        if (post.authorId !== userId) await ModerationService.assertModerator({ id: userId, role }, { post });

        const deleted = await withLikeIds(post);
        // Its comments and likes go with it (foreign keys).
        await db.delete(posts).where(eq(posts.id, post.id));
        await deleteImages(post.image);
        return deleted;
    },

    async getPostById(postId: string) {
        const [post] = isUuid(postId) ? await listPosts(eq(posts.id, postId)) : [];
        if (!post) throw createHttpError(404, "Post not found");
        return post;
    }
};
