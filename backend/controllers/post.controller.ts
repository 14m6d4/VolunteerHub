import { Request, Response, NextFunction } from "express";
import { PostService } from "../services/post.service.ts";

export const PostController = {
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req.user as any)._id;

            const post = await PostService.createPost({
                userId,
                discussionId: req.params.discussionId,
                content: req.body.content,
                files: req.files as Express.Multer.File[]
            });

            res.status(201).json({ success: true, data: post });
        } catch (err) {
            next(err);
        }
    },

    async getByDiscussion(req: Request, res: Response, next: NextFunction) {
        try {
            const posts = await PostService.getPostsByDiscussion(
                req.params.discussionId
            );
            res.json({ success: true, data: posts });
        } catch (err) {
            next(err);
        }
    },

    async like(req: Request, res: Response, next: NextFunction) {
        try {
            const post = await PostService.likePost(
                (req.user as any)._id,
                req.params.postId
            );
            res.json({ success: true, data: post });
        } catch (err) {
            next(err);
        }
    },

    async delete(req: Request, res: Response, next: NextFunction) {
        try {
            const post = await PostService.deletePost(req.params.postId);
            res.json({ success: true, data: post });
        } catch (err) {
            next(err);
        }
    },

    async pin(req: Request, res: Response, next: NextFunction) {
        try {
            const post = await PostService.togglePin(req.params.postId);
            res.json({ success: true, data: post });
        } catch (err) {
            next(err);
        }
    }
};
