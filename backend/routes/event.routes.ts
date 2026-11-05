import express from "express";
import { EventController } from "../controllers/event.controller.ts";
import { CalendarController } from "../controllers/calendar.controller.ts";
import { authMiddleware, optionalAuthMiddleware } from "../middlewares/auth.middleware.ts";
import { roleMiddleware } from "../middlewares/role.middleware.ts";
import { validateBody } from "../middlewares/validation.middleware.ts";
import { createEventSchema, updateEventSchema } from "../utils/validators.ts";

import { uploadImage } from "../middlewares/upload.middleware.ts";

const router = express.Router();


router.get("/", optionalAuthMiddleware, EventController.list);
router.post("/", authMiddleware, roleMiddleware(["manager", "admin"]), uploadImage("image"), validateBody(createEventSchema), EventController.create);
router.put("/:id", authMiddleware, roleMiddleware(["manager", "admin"]), uploadImage("image"), validateBody(updateEventSchema), EventController.update);
router.patch("/:id/approve", authMiddleware, roleMiddleware(["admin"]), EventController.approve);
router.delete("/:id", authMiddleware, roleMiddleware(["manager", "admin"]), EventController.delete);
router.post("/:eventId/pin", authMiddleware, roleMiddleware(["manager", "admin"]), EventController.pinPost);
router.get("/:id/stats", authMiddleware, roleMiddleware(["manager", "admin"]), EventController.stats);
router.get("/:id/posts", EventController.getPosts);
// The .ics of one event, for a volunteer approved for it (404 for anyone else).
router.get("/:id/calendar.ics", authMiddleware, CalendarController.event);
router.get("/:id", EventController.getById);
router.patch("/:id/complete", authMiddleware, roleMiddleware(["manager", "admin"]), EventController.complete);


export default router;
