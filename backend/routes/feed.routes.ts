// routes/feed.routes.ts
import { Router } from "express";
import { FeedController } from "../controllers/feed.controller.ts";

const router = Router();

router.get("/feed", FeedController.getFeed); // Route để lấy bảng tin theo tab

export default router;
