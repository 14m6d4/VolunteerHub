import express from "express";
import multer from "multer";
import { DiscussionController } from "../controllers/discussion.controller.ts";
import { PostController } from "../controllers/post.controller.ts";
import { authMiddleware } from "../middlewares/auth.middleware.ts";

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

router.get("/:group-id/posts", authMiddleware, PostController.getByDiscussion);

// 1 API duy nhất: tạo bài đăng + upload ảnh
router.post(
    "/:group-id/posts",
    authMiddleware,
    upload.array("images", 10),
    PostController.create
);

router.post("group-id/posts/:postId/like", authMiddleware, PostController.like);
router.delete("group-id/posts/:postId", authMiddleware, PostController.delete);
router.post("group-id/posts/:postId/pin", authMiddleware, PostController.pin);

export default router;
