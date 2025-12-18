import { Request, Response, NextFunction } from "express";
import { FeedService } from "../services/feed.service.ts";

export const FeedController = {
    async getFeed(req: Request, res: Response, next: NextFunction) {
        try {
            const user = req.user;
            const page = Number(req.query.page || 1);
            const limit = Number(req.query.limit || 20);
            const tab = req.query.tab as string || "all";

            const feed = await FeedService.getFeed({ page, limit, tab }, user);

            res.json({ success: true, data: feed });
        } catch (err) {
            next(err);
        }
    },
};
