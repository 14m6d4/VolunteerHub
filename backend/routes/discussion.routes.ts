import express from "express";
import multer from "multer";
import { DiscussionController } from "../controllers/discussion.controller.ts";
import { authMiddleware } from "../middlewares/auth.middleware.ts";

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

router.get("/:group-id/posts", authMiddleware, DiscussionController.getPosts);

export default router;
