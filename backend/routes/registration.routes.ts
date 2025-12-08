import express from "express";
import { RegistrationController } from "../controllers/registration.controller.ts";
import { authMiddleware } from "../middlewares/auth.middleware.ts";
import { roleMiddleware } from "../middlewares/role.middleware.ts";

const router = express.Router();

// user can view their registrations → PHẢI ĐỂ TRÊN
router.get("/me", authMiddleware, RegistrationController.myRegistrations);

// manager approves a registration
router.post("/approve/:regId", authMiddleware, roleMiddleware(["manager", "admin"]), RegistrationController.approve);

// mark completed
router.post("/complete/:regId", authMiddleware, roleMiddleware(["manager", "admin"]), RegistrationController.markCompleted);

// list registrations for event (manager/admin)
router.get("/:eventId", authMiddleware, roleMiddleware(["manager", "admin"]), RegistrationController.listForEvent);

// register to event
router.post("/:eventId", authMiddleware, RegistrationController.register);

// cancel registration (volunteer)
router.delete("/:eventId", authMiddleware, RegistrationController.cancel);

export default router;
