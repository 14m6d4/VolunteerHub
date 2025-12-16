import express from "express";
import multer from "multer";
import { PostController } from "../controllers/post.controller.ts";
import { authMiddleware } from "../middlewares/auth.middleware.ts";

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

router.post("/", authMiddleware, upload.array("images", 10), PostController.create);
router.post("/posts/:postId/like", authMiddleware, PostController.like);
router.delete("/posts/:postId", authMiddleware, PostController.delete);
router.post("/posts/:postId/pin", authMiddleware, PostController.pin);

export default router;
