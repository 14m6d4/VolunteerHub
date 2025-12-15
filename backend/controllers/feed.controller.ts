// controllers/Feed.controller.ts
import { Request, Response, NextFunction } from "express";
import { FeedService } from "../services/feed.service.ts";

export const FeedController = {
    async getFeed(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req.user as any)._id; // Lấy userId từ JWT hoặc session
            const { tab } = req.query; // Tab có thể là "all", "joined", "not-joined"

            // Kiểm tra giá trị của tab
            if (!["all", "joined", "not-joined"].includes(tab as string)) {
                return res.status(400).json({ success: false, message: "Invalid tab" });
            }

            const posts = await FeedService.getFeed(userId, tab as "all" | "joined" | "not-joined");

            res.json({ success: true, data: posts });
        } catch (err) {
            next(err);
        }
    }
};
