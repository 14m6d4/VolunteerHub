import { Router } from "express";
import { CommentController } from "../controllers/comment.controller.ts";
import { authMiddleware } from "../middlewares/auth.middleware.ts";

const router = Router({ mergeParams: true });

router.post("/post/:postId", authMiddleware, CommentController.createComment);
router.get("/post/:postId", CommentController.getComments);
router.post("/like/:commentId", authMiddleware, CommentController.likeComment);
router.delete("/:commentId", authMiddleware, CommentController.deleteComment);

export default router;
