import { and, desc, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { db } from "../db/client.ts";
import { commentLikes, comments, users } from "../db/schema.ts";
import { NotificationService } from "./notification.service.ts";
import { NotificationType } from "../models/Notification.model.ts";
import { commentLikerIds, getCommentRow, getPostRow, toComment } from "../utils/post.util.ts";
import { isUuid, toLean } from "../utils/user.util.ts";

const withLikeIds = async (row: typeof comments.$inferSelect) =>
    toComment(row, (await commentLikerIds([row.id])).get(row.id) ?? []);

export const CommentService = {
    async createComment(userId: string, postId: string, content: string) {
        const post = await getPostRow(postId);
        if (!post) throw createHttpError(404, "Post not found");
        if (!content) throw createHttpError(400, "Comment content is required");

        const [comment] = await db.insert(comments).values({ postId: post.id, authorId: userId, content }).returning();

        if (post.authorId !== userId) {
            try {
                const [commenter] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId));
                if (commenter) {
                    await NotificationService.notify(post.authorId, {
                        type: NotificationType.POST_COMMENTED,
                        title: "New Comment",
                        body: `${commenter.name} commented on your post: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
                        data: { postId, commentId: comment!.id, userId, actorName: commenter.name, eventId: post.eventId }
                    });
                }
            } catch (err) {
                console.error("Failed to send comment notification:", err);
            }
        }

        return toComment(comment!, []);
    },

    async getCommentsByPost(postId: string) {
        if (!isUuid(postId)) return [];
        const rows = await db.select({
            comment: comments,
            author: { id: users.id, name: users.name, username: users.username, profilePicture: users.profilePicture },
        }).from(comments)
            .innerJoin(users, eq(users.id, comments.authorId))
            .where(eq(comments.postId, postId))
            .orderBy(desc(comments.createdAt), desc(comments.id));
        const likes = await commentLikerIds(rows.map((r) => r.comment.id));
        return rows.map(({ comment, author }) => ({
            ...toComment(comment, likes.get(comment.id) ?? []),
            authorId: toLean(author),
        }));
    },

    async likeComment(userId: string, commentId: string) {
        const comment = await getCommentRow(commentId);
        if (!comment) throw createHttpError(404, "Comment not found");

        // Liking again takes the like back.
        const removed = await db.delete(commentLikes)
            .where(and(eq(commentLikes.commentId, comment.id), eq(commentLikes.userId, userId)))
            .returning({ userId: commentLikes.userId });
        if (!removed.length) await db.insert(commentLikes).values({ commentId: comment.id, userId }).onConflictDoNothing();

        return withLikeIds(comment);
    },

    async deleteComment(commentId: string, userId: string, role: string) {
        const comment = await getCommentRow(commentId);
        if (!comment) throw createHttpError(404, "Comment not found");

        const isOwner = comment.authorId === userId;
        const isAdmin = role === "admin";
        const isManager = role === "manager";

        if (!isOwner && !isAdmin && !isManager) {
            throw createHttpError(403, "You do not have permission to delete this comment");
        }

        const deleted = await withLikeIds(comment);
        await db.delete(comments).where(eq(comments.id, comment.id));
        return deleted;
    }
};
