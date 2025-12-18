import type { Request, Response, NextFunction } from "express";
import { FeedService } from "../services/feed.service.ts";

export const FeedController = {
    async getFeed(req: Request, res: Response, next: NextFunction) {
        try {
            const page = Number(req.query.page || 1);
            const limit = Number(req.query.limit || 20);

            const feed = await FeedService.getFeed({ page, limit });

            return res.json({
                success: true,
                page,
                limit,
                data: feed
            });
        } catch (err) {
            next(err);
        }
    }
};
