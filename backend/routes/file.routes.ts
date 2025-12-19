import { Router } from "express";
import { FileController } from "../controllers/file.controller.ts";

const router = Router();

router.get("/:id", FileController.getFile);

export default router;
