import express from "express";
import multer from "multer";
import { DiscussionController } from "../controllers/discussion.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = express.Router();

// Dùng memoryStorage để không lưu file vào disk
const upload = multer({ storage: multer.memoryStorage() });

router.get("/:discussionId/posts", authMiddleware, DiscussionController.getPosts);

// 1 API duy nhất: tạo bài đăng + upload ảnh
router.post(
    "/:discussionId/posts",
    authMiddleware,
    upload.array("images", 10), // nhận tối đa 10 ảnh
    DiscussionController.createPost
);

router.post("/posts/:postId/like", authMiddleware, DiscussionController.likePost);
router.delete("/posts/:postId", authMiddleware, DiscussionController.deletePost);
router.post("/posts/:postId/pin", authMiddleware, DiscussionController.pinPost);

export default router;
