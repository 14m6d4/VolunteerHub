// controllers/Discussion.controller.ts
import type { Request, Response, NextFunction } from "express";
import { DiscussionService } from "../services/discussion.service.ts";

export const DiscussionController = {
    async createPost(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req.user as any)._id;
            const post = await DiscussionService.createPost(userId, req.body);
            return res.status(201).json({ success: true, data: post });
        } catch (err) {
            next(err);
        }
    },

    async getPosts(req: Request, res: Response, next: NextFunction) {
        try {
            const posts = await DiscussionService.getPosts(req.params.discussionId);
            return res.json({ success: true, data: posts });
        } catch (err) {
            next(err);
        }
    },

    async likePost(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req.user as any)._id;
            const post = await DiscussionService.likePost(userId, req.params.postId);
            return res.json({ success: true, data: post });
        } catch (err) {
            next(err);
        }
    },

    async deletePost(req: Request, res: Response, next: NextFunction) {
        try {
            if (req.user.role !== 'admin' && req.user.role !== 'manager') {
                if (req.user.role == 'volunteer' && req.user._id !== post.authorId) {
                    return res.status(403).json({ success: false, message: "Forbidden" });
                }
            }
            const post = await DiscussionService.deletePost(req.params.postId);
            return res.json({ success: true, data: post });
        } catch (err) {
            next(err);
        }
    },

    async pinPost(req: Request, res: Response, next: NextFunction) {
        try {
            const post = await DiscussionService.pinPost(req.params.postId);
            return res.json({ success: true, data: post });
        } catch (err) {
            next(err);
        }
    }
};
