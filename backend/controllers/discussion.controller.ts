import type { Request, Response, NextFunction } from "express";
import { PostModel } from "../models/Post.model.ts";
import { DiscussionModel } from "../models/Discussion.model.ts";
import createHttpError from "http-errors";

export const DiscussionController = {
    async createPost(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req.user as any)._id;
            const { discussionId, eventId, content, attachments } = req.body;
            const discussion = await DiscussionModel.findById(discussionId) || (eventId ? await DiscussionModel.findOne({ eventId }) : null);
            if (!discussion) throw createHttpError(404, "Discussion not found");
            if (discussion.locked) throw createHttpError(403, "Discussion locked");
            const post = await PostModel.create({
                discussionId: discussion._id,
                eventId,
                authorId: userId,
                content,
                attachments: attachments || []
            });
            return res.status(201).json({ success: true, data: post });
        } catch (err) {
            next(err);
        }
    },

    async getPosts(req: Request, res: Response, next: NextFunction) {
        try {
            const discussionId = req.params.discussionId;
            const posts = await PostModel.find({ discussionId }).sort({ pinned: -1, createdAt: -1 }).limit(200);
            return res.json({ success: true, data: posts });
        } catch (err) {
            next(err);
        }
    },

    async likePost(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req.user as any)._id;
            const postId = req.params.postId;
            const post = await PostModel.findById(postId);
            if (!post) throw createHttpError(404, "Post not found");
            const idx = post.likes.findIndex((id) => id.equals(userId));
            if (idx === -1) {
                post.likes.push(userId);
            } else {
                post.likes.splice(idx, 1);
            }
            await post.save();
            return res.json({ success: true, data: post });
        } catch (err) {
            next(err);
        }
    },

    async deletePost(req: Request, res: Response, next: NextFunction) {
        try {
            const postId = req.params.postId;
            const post = await PostModel.findByIdAndDelete(postId);
            if (!post) throw createHttpError(404, "Post not found");
            return res.json({ success: true, data: post });
        } catch (err) {
            next(err);
        }
    }
};
