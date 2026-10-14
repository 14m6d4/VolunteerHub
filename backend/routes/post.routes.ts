import express from "express";
import { PostController } from "../controllers/post.controller.ts";
import { authMiddleware } from "../middlewares/auth.middleware.ts";
import { uploadImage } from "../middlewares/upload.middleware.ts";

const router = express.Router();

router.post("/", authMiddleware, uploadImage("image"), PostController.create);
router.post("/:postId/like", authMiddleware, PostController.like);
router.delete("/:postId", authMiddleware, PostController.delete);
router.post("/:postId/pin", authMiddleware, PostController.pin);
router.get("/:postId", authMiddleware, PostController.getById);

export default router;
