import express from "express";
import { DiscussionController } from "../controllers/discussion.controller.ts";
import { authMiddleware } from "../middlewares/auth.middleware.ts";
import { roleMiddleware } from "../middlewares/role.middleware.ts";
import commentRoutes from "./comment.routes.ts";

const router = express.Router();

router.get("/:discussionId/posts", authMiddleware, DiscussionController.getPosts);
router.post("/:discussionId/posts", authMiddleware, DiscussionController.createPost);
router.post("/posts/:postId/like", authMiddleware, DiscussionController.likePost);
router.delete("/posts/:postId", authMiddleware, DiscussionController.deletePost);

router.use("/:postId/comments", authMiddleware, commentRoutes);

export default router;
