import express from "express";
import { DiscussionController } from "../controllers/discussion.controller.ts";
import { authMiddleware } from "../middlewares/auth.middleware.ts";
import { roleMiddleware } from "../middlewares/role.middleware.ts";

const router = express.Router();

router.get("/:discussionId/posts", authMiddleware, DiscussionController.getPosts);
router.post("/:discussionId/posts", authMiddleware, DiscussionController.createPost);
router.post("/posts/:postId/like", authMiddleware, DiscussionController.likePost);
// manager/admin delete post
router.delete("/posts/:postId", authMiddleware, roleMiddleware(["manager", "admin"]), DiscussionController.deletePost);

export default router;
