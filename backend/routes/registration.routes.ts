import express from "express";
import { RegistrationController } from "../controllers/registration.controller.ts";
import { authMiddleware } from "../middlewares/auth.middleware.ts";
import { roleMiddleware } from "../middlewares/role.middleware.ts";

const router = express.Router();

router.get("/me", authMiddleware, RegistrationController.myRegistrations);

router.post("/:regId/approve", authMiddleware, roleMiddleware(["manager", "admin"]), RegistrationController.approve);

router.post("/:regId/reject", authMiddleware, roleMiddleware(["manager", "admin"]), RegistrationController.reject);

router.post("/:regId/kick", authMiddleware, roleMiddleware(["manager", "admin"]), RegistrationController.kickFromEvent);

router.get("/:eventId", authMiddleware, roleMiddleware(["manager", "admin"]), RegistrationController.listForEvent);

router.post("/:eventId", authMiddleware, RegistrationController.register);

router.delete("/:eventId", authMiddleware, RegistrationController.cancel);

export default router;
