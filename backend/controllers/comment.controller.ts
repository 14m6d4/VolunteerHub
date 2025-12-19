import type { Request, Response, NextFunction } from "express";
import { CommentService } from "../services/comment.service.ts";

export const CommentController = {
    async createComment(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req.user as any)._id;
            const { postId } = req.params;
            const { content } = req.body;
            console.log(userId, postId, content)
            const comment = await CommentService.createComment(userId, postId, content);

            return res.status(201).json({ success: true, data: comment });
        } catch (err) {
            next(err);
        }
    },

    async getComments(req: Request, res: Response, next: NextFunction) {
        try {
            const { postId } = req.params;
            const comments = await CommentService.getCommentsByPost(postId);

            return res.json({ success: true, data: comments });
        } catch (err) {
            next(err);
        }
    },

    async likeComment(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req.user as any)._id;
            const commentId = req.params.commentId;

            const comment = await CommentService.likeComment(userId, commentId);

            return res.json({ success: true, data: comment });
        } catch (err) {
            next(err);
        }
    },

    async deleteComment(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req.user as any)._id;
            const role = (req.user as any).role;
            const commentId = req.params.commentId;

            const comment = await CommentService.deleteComment(commentId, userId, role);

            return res.json({ success: true, data: comment });
        } catch (err) {
            next(err);
        }
    }
};
