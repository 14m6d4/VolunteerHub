import createHttpError from "http-errors";
import { CommentModel } from "../models/Comment.model.ts";
import { PostModel } from "../models/Post.model.ts";
import { NotificationService } from "./notification.service.ts";
import { NotificationType } from "../models/Notification.model.ts";
import User from "../models/User.model.ts";

export const CommentService = {
    async createComment(userId: string, postId: string, content: string) {
        const post = await PostModel.findById(postId).populate('authorId');
        if (!post) throw createHttpError(404, "Post not found");

        const comment = await CommentModel.create({
            postId,
            authorId: userId,
            content
        });

        if (post.authorId._id.toString() !== userId) {
            try {
                const commenter = await User.findById(userId).select('name username');
                if (commenter) {
                    await NotificationService.notify(post.authorId._id.toString(), {
                        type: NotificationType.POST_COMMENTED,
                        title: "New Comment",
                        body: `${commenter.name} commented on your post: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
                        data: { postId, commentId: comment._id.toString(), userId, actorName: commenter.name, eventId: post.eventId?.toString() }
                    });
                }
            } catch (err) {
                console.error("Failed to send comment notification:", err);
            }
        }

        return comment;
    },

    async getCommentsByPost(postId: string) {
        return CommentModel.find({ postId })
            .sort({ createdAt: -1 })
            .populate("authorId", "name username profilePicture");
    },

    async likeComment(userId: string, commentId: string) {
        const comment = await CommentModel.findById(commentId);
        if (!comment) throw createHttpError(404, "Comment not found");

        const idx = comment.likes.findIndex((id) => id.equals(userId));

        if (idx === -1) comment.likes.push(userId);
        else comment.likes.splice(idx, 1);

        await comment.save();
        return comment;
    },

    async deleteComment(commentId: string, userId: string, role: string) {
        const comment = await CommentModel.findById(commentId);
        if (!comment) throw createHttpError(404, "Comment not found");

        const isOwner = comment.authorId.equals(userId);
        const isAdmin = role === "admin";
        const isManager = role === "manager";

        if (!isOwner && !isAdmin && !isManager) {
            throw createHttpError(403, "You do not have permission to delete this comment");
        }

        await comment.deleteOne();
        return comment;
    }
};
