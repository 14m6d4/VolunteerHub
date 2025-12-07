import express from "express";
import { RegistrationController } from "../controllers/registration.controller.ts";
import { authMiddleware } from "../middlewares/auth.middleware.ts";
import { roleMiddleware } from "../middlewares/role.middleware.ts";

const router = express.Router();

// register to event
router.post("/:eventId", authMiddleware, RegistrationController.register);

// cancel registration (volunteer)
router.delete("/:eventId", authMiddleware, RegistrationController.cancel);

// manager approves a registration
router.post("/approve/:regId", authMiddleware, roleMiddleware(["manager", "admin"]), RegistrationController.approve);

// mark completed
router.post("/complete/:regId", authMiddleware, roleMiddleware(["manager", "admin"]), RegistrationController.markCompleted);

// list registrations for event (manager/admin)
router.get("/event/:eventId", authMiddleware, roleMiddleware(["manager", "admin"]), RegistrationController.listForEvent);

// user can view their registrations
router.get("/me", authMiddleware, RegistrationController.myRegistrations);

export default router;
