import express from "express";
import { EventController } from "../controllers/event.controller.ts";
import { authMiddleware } from "../middlewares/auth.middleware.ts";
import { roleMiddleware } from "../middlewares/role.middleware.ts";
import { validateEventBody } from "../middlewares/validation.middleware.ts";
import { createEventSchema, updateEventSchema } from "../utils/validators.ts";

const router = express.Router();

/**
 * Public endpoints
 */
router.get("/", EventController.list);
router.get("/:id", EventController.getById);

/**
 * Protected routes - require authentication
 */
router.post("/", authMiddleware, roleMiddleware(["manager", "admin"]), validateEventBody(createEventSchema), EventController.create);
router.put("/:id", authMiddleware, roleMiddleware(["manager", "admin"]), validateEventBody(updateEventSchema), EventController.update);
router.post("/:id/approve", authMiddleware, roleMiddleware(["admin"]), EventController.approve);
router.post("/:id/cancel", authMiddleware, roleMiddleware(["manager", "admin"]), EventController.cancel);
router.post("/:eventId/pin", authMiddleware, roleMiddleware(["manager", "admin"]), EventController.pinPost);
router.get("/:id/stats", authMiddleware, roleMiddleware(["manager", "admin"]), EventController.stats);

export default router;
