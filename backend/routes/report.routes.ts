import express from "express";
import { ReportService } from "../services/report.service.ts";
import { ReportTargetType } from "../models/Report.model.ts";
import { authMiddleware, type AuthenticatedRequest } from "../middlewares/auth.middleware.ts";

const router = express.Router();

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
            const filter: any = { targetType: { $in: [ReportTargetType.User, ReportTargetType.Event] } };

            if (status && status !== 'all') {
                filter.status = status;
            }

            if (type && type !== 'all' && (type === ReportTargetType.User || type === ReportTargetType.Event)) {
                filter.targetType = type;
            }

            reports = await ReportService.getAllReports(filter);
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
        const { eventId } = req.params;
        const user = (req as AuthenticatedRequest).user;


        const reports = await ReportService.getReportsForEvent(eventId);
        res.json(reports);
    } catch (error: any) {
        console.error("[ReportRoutes] Error fetching event reports:", error);
        res.status(400).json({ message: error.message });
    }
});

router.get("/:targetType/:targetId", async (req, res) => {
    const { targetType, targetId } = req.params;
    const reportType = targetType === 'event' ? ReportTargetType.Event : ReportTargetType.Post;

    try {
        const reports = await ReportService.getReportsByTarget(targetId, reportType);
        res.json(reports);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
});

router.patch("/:reportId", async (req, res) => {
    const { reportId } = req.params;
    const { status } = req.body;

    try {
        const updatedReport = await ReportService.updateReportStatus(reportId, status);
        res.json(updatedReport);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

export default router;
