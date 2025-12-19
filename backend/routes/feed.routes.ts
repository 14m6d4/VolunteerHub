import express from "express";
import { FeedController } from "../controllers/feed.controller.ts";
import { optionalAuthMiddleware } from "../middlewares/auth.middleware.ts";

const router = express.Router();

router.get("/", optionalAuthMiddleware, FeedController.getFeed);

export default router;
