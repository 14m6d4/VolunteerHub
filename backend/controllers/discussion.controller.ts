import type { Request, Response, NextFunction } from "express";
import { DiscussionService } from "../services/discussion.service.ts";

export const DiscussionController = {
    async createPost(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req.user as any)._id;
            const discussionId = req.params.discussionId;

            const content = req.body.content || "";

            // req.files = danh sách file upload từ multipart/form-data
            const files = req.files as Express.Multer.File[];

            const post = await DiscussionService.createPost({
                userId,
                discussionId,
                content,
                files
            });

            res.status(201).json({ success: true, data: post });
        } catch (err) {
            next(err);
        }
    },

    async getPosts(req: Request, res: Response, next: NextFunction) {
        try {
            const posts = await DiscussionService.getPosts(req.params.discussionId);
            res.json({ success: true, data: posts });
        } catch (err) {
            next(err);
        }
    },


    async likePost(req, res, next) {
        try {
            const userId = (req.user as any)._id;
            const post = await DiscussionService.likePost(userId, req.params.postId);
            res.json({ success: true, data: post });
        } catch (err) {
            next(err);
        }
    },

    async deletePost(req, res, next) {
        try {
            const post = await DiscussionService.deletePost(req.params.postId);
            res.json({ success: true, data: post });
        } catch (err) {
            next(err);
        }
    },

    async pinPost(req, res, next) {
        try {
            const post = await DiscussionService.pinPost(req.params.postId);
            res.json({ success: true, data: post });
        } catch (err) {
            next(err);
        }
    }
};
