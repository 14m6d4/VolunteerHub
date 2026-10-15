import express from "express";
import { PostController } from "../controllers/post.controller.ts";
import { authMiddleware } from "../middlewares/auth.middleware.ts";

const router = express.Router();

router.get("/:discussionId/posts", authMiddleware, PostController.getByDiscussion);

export default router;
