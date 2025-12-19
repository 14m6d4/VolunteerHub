import express from "express";
import multer from "multer";
import { PostController } from "../controllers/post.controller.ts";
import { authMiddleware } from "../middlewares/auth.middleware.ts";

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

router.post("/", authMiddleware, upload.single("image"), PostController.create);
router.post("/:postId/like", authMiddleware, PostController.like);
router.delete("/:postId", authMiddleware, PostController.delete);
router.post("/:postId/pin", authMiddleware, PostController.pin);

export default router;
