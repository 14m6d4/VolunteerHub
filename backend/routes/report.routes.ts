import express from "express";
import { ReportService } from "../services/report.service.ts";
import { ReportTargetType } from "../types/report.ts";
import { authMiddleware, type AuthenticatedRequest } from "../middlewares/auth.middleware.ts";
import { roleMiddleware } from "../middlewares/role.middleware.ts";
import { UserRole } from "../types/user.ts";
import { EventService } from "../services/event.service.ts";

const router = express.Router();

// Reports name their reporter and carry the reported content, and their status
// decides whether moderation acts on them. Reading or resolving one is a
// moderator action, never a public one.
//
// Managers are not interchangeable: GET /admin/all already scopes them to
// events they own via getReportsForManager. Anything that reaches reports
// across every event is therefore admin-only, so one manager cannot read
// another's reports - or dismiss a report filed about their own event.
const adminOnly = [authMiddleware, roleMiddleware([UserRole.Admin])];

router.post("/event", authMiddleware, async (req, res) => {
    const { eventId, reason, description } = req.body;
    const user = (req as AuthenticatedRequest).user;
    try {
        const report = await ReportService.reportEvent(user._id.toString(), eventId, reason, description);
        res.status(201).json(report);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
});

router.post("/user", authMiddleware, async (req, res) => {
    const { targetId, reason, description } = req.body;
    const user = (req as AuthenticatedRequest).user;
    try {
        const report = await ReportService.reportUser(user._id.toString(), targetId, reason, description);
        res.status(201).json(report);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
});

router.post("/post", authMiddleware, async (req, res) => {
    const { postId, reason, description } = req.body;
    const user = (req as AuthenticatedRequest).user;
    try {
        const report = await ReportService.reportPost(user._id.toString(), postId, reason, description);
        res.status(201).json(report);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
});

router.get("/admin/all", authMiddleware, async (req, res) => {
    try {
        const user = (req as AuthenticatedRequest).user;
        const { status, type } = req.query;

        console.log(`[ReportRoutes] GET /admin/all - User: ${user.username} (${user.role})`);

        let reports: any[] = [];

        if (user.role === 'admin') {
            // Post reports are the managers' to handle.
            const targetTypes = type === ReportTargetType.User || type === ReportTargetType.Event
                ? [type]
                : [ReportTargetType.User, ReportTargetType.Event];

            reports = await ReportService.getAllReports({
                targetTypes,
                ...(status && status !== 'all' ? { status: String(status) } : {}),
            });
        } else if (user.role === 'manager') {
            reports = await ReportService.getReportsForManager(user._id.toString());
            if (status && status !== 'all') {
                reports = reports.filter((r: any) => r.status === status);
            }
        } else {
            return res.status(403).json({ message: "Forbidden" });
        }

        res.json(reports);
    } catch (error: any) {
        console.error("[ReportRoutes] Error:", error);
        res.status(400).json({ message: error.message });
    }
});

router.get("/event/:eventId/reports", authMiddleware, async (req, res) => {
    try {
        const eventId = req.params.eventId as string;
        const user = (req as AuthenticatedRequest).user;

        // Admins see any event; a manager sees only events they run.
        if (user.role !== UserRole.Admin) {
            const managerId = await EventService.getManagerId(eventId);
            if (!managerId) return res.status(404).json({ message: "Event not found" });
            if (user.role !== UserRole.Manager || managerId !== user._id) {
                return res.status(403).json({ message: "Forbidden" });
            }
        }

        const reports = await ReportService.getReportsForEvent(eventId);
        res.json(reports);
    } catch (error: any) {
        console.error("[ReportRoutes] Error fetching event reports:", error);
        res.status(400).json({ message: error.message });
    }
});

router.get("/:targetType/:targetId", ...adminOnly, async (req, res) => {
    const { targetType, targetId } = req.params;
    const reportType = targetType === 'event' ? ReportTargetType.Event : ReportTargetType.Post;

    try {
        const reports = await ReportService.getReportsByTarget(targetId as string, reportType);
        res.json(reports);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
});

router.patch("/:reportId", ...adminOnly, async (req, res) => {
    const { reportId } = req.params;
    const { status } = req.body;

    try {
        const updatedReport = await ReportService.updateReportStatus(reportId as string, status);
        res.json(updatedReport);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
});

export default router;
