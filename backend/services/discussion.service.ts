import createHttpError from "http-errors";
import { DiscussionModel } from "../models/Discussion.model.ts";
import { PostModel } from "../models/Post.model.ts";

export const DiscussionService = {
    async createPost(userId: string, payload: any) {
        const { discussionId, eventId, content, attachments } = payload;

        const discussion =
            (await DiscussionModel.findById(discussionId)) ||
            (eventId ? await DiscussionModel.findOne({ eventId }) : null);

        if (!discussion) throw createHttpError(404, "Discussion not found");
        if (discussion.locked) throw createHttpError(403, "Discussion locked");

        const post = await PostModel.create({
            discussionId: discussion._id,
            eventId,
            authorId: userId,
            content,
            attachments: attachments || []
        });

        return post;
    },

    async getPosts(discussionId: string) {
        return PostModel.find({ discussionId })
            .sort({ pinned: -1, createdAt: -1 })
            .limit(200);
    },

    async likePost(userId: string, postId: string) {
        const post = await PostModel.findById(postId);
        if (!post) throw createHttpError(404, "Post not found");

        const idx = post.likes.findIndex((id) => id.equals(userId));

        if (idx === -1) post.likes.push(userId);
        else post.likes.splice(idx, 1);

        await post.save();
        return post;
    },

    async deletePost(postId: string) {
        const post = await PostModel.findByIdAndDelete(postId);
        if (!post) throw createHttpError(404, "Post not found");
        return post;
    },

    async pinPost(postId: string) {
        const post = await PostModel.findById(postId);
        if (!post) throw createHttpError(404, "Post not found");

        post.pinned = true;
        await post.save();
        return post;
    }
};
