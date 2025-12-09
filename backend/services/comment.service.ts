import createHttpError from "http-errors";
import { CommentModel } from "../models/Comment.model.ts";
import { PostModel } from "../models/Post.model.ts";

export const CommentService = {
    async createComment(userId: string, postId: string, content: string) {
        const post = await PostModel.findById(postId);
        if (!post) throw createHttpError(404, "Post not found");

        const comment = await CommentModel.create({
            postId,
            authorId: userId,
            content
        });

        return comment;
    },

    async getCommentsByPost(postId: string) {
        return CommentModel.find({ postId })
            .sort({ createdAt: -1 })
            .populate("authorId", "name avatar");
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

    async deleteComment(commentId: string, userId: string) {
        const comment = await CommentModel.findById(commentId);
        if (!comment) throw createHttpError(404, "Comment not found");

        if (!comment.authorId.equals(userId))
            throw createHttpError(403, "You cannot delete comment of others");

        await comment.deleteOne();

        return comment;
    }
};
