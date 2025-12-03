import express from "express";
import { EventController } from "../controllers/event.controller.ts";
import { authMiddleware, optionalAuthMiddleware } from "../middlewares/auth.middleware.ts";
import { roleMiddleware } from "../middlewares/role.middleware.ts";
import { validateBody } from "../middlewares/validation.middleware.ts";
import { createEventSchema, updateEventSchema } from "../utils/validators.ts";

const router = express.Router();


router.get("/", optionalAuthMiddleware, EventController.list);
router.post("/", authMiddleware, roleMiddleware(["manager", "admin"]), validateBody(createEventSchema), EventController.create);
router.get("/all", EventController.getAll);
router.put("/:id", authMiddleware, roleMiddleware(["manager", "admin"]), validateBody(updateEventSchema), EventController.update);
router.patch("/:id/approve", authMiddleware, roleMiddleware(["admin"]), EventController.approve);
router.post("/:id/cancel", authMiddleware, roleMiddleware(["manager", "admin"]), EventController.cancel);
router.post("/:eventId/pin", authMiddleware, roleMiddleware(["manager", "admin"]), EventController.pinPost);
router.get("/:id/stats", authMiddleware, roleMiddleware(["manager", "admin"]), EventController.stats);

router.get("/:id", EventController.getById);
export default router;
