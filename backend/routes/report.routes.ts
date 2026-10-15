import express from "express";
import { ReportController } from "../controllers/report.controller.ts";
import { authMiddleware } from "../middlewares/auth.middleware.ts";
import { roleMiddleware } from "../middlewares/role.middleware.ts";
import { validateBody } from "../middlewares/validation.middleware.ts";
import { UserRole } from "../types/user.ts";
import { reportEventSchema, reportPostSchema, reportUserSchema } from "../utils/validators.ts";

const router = express.Router();

// Reports name their reporter and carry the reported content, and their status
// decides whether moderation acts on them. Reading or resolving one is a
// moderator action, never a public one; the report module decides which.
const moderators = [authMiddleware, roleMiddleware([UserRole.Manager, UserRole.Admin])];

router.post("/event", authMiddleware, validateBody(reportEventSchema), ReportController.reportEvent);
router.post("/user", authMiddleware, validateBody(reportUserSchema), ReportController.reportUser);
router.post("/post", authMiddleware, validateBody(reportPostSchema), ReportController.reportPost);

router.get("/admin/all", ...moderators, ReportController.list);
router.get("/event/:eventId/reports", authMiddleware, ReportController.listForEvent);
router.get("/:targetType/:targetId", authMiddleware, roleMiddleware([UserRole.Admin]), ReportController.listForTarget);
router.patch("/:reportId", ...moderators, ReportController.setStatus);

export default router;
