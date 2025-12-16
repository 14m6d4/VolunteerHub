import type { Request, Response, NextFunction } from "express";
import { DiscussionService } from "../services/discussion.service.ts";

export const DiscussionController = {
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const discussion = await DiscussionService.createDiscussion(
                req.body.eventId
            );
            res.status(201).json({ success: true, data: discussion });
        } catch (err) {
            next(err);
        }
    },

    async getByEvent(req: Request, res: Response, next: NextFunction) {
        try {
            const discussion = await DiscussionService.getByEventId(
                req.params.eventId
            );
            res.json({ success: true, data: discussion });
        } catch (err) {
            next(err);
        }
    },

    async lock(req: Request, res: Response, next: NextFunction) {
        try {
            const discussion = await DiscussionService.lockDiscussion(
                req.params.discussionId
            );
            res.json({ success: true, data: discussion });
        } catch (err) {
            next(err);
        }
    },

    async getPosts(req: Request, res: Response, next: NextFunction) {
        try {
            const discussions = await DiscussionService.getDiscussionPosts(
                (req.user as any)._id
            );
            res.json({ success: true, data: discussions });
        } catch (err) {
            next(err);
        }
    }
};
