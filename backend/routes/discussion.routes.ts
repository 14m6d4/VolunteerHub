import express from "express";
import { DiscussionController } from "../controllers/discussion.controller.ts";
import { authMiddleware } from "../middlewares/auth.middleware.ts";

const router = express.Router();

router.get("/:group-id/posts", authMiddleware, DiscussionController.getPosts);

export default router;
