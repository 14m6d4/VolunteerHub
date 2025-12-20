import express from "express";
import { ReportService } from "../services/report.service.ts";
import { ReportTargetType } from "../models/Report.model.ts";
import { authMiddleware, type AuthenticatedRequest } from "../middlewares/auth.middleware.ts";

const router = express.Router();

// Báo cáo sự kiện
router.post("/report/event", async (req, res) => {
    const { reporterId, eventId, reason, description } = req.body;
    try {
        const report = await ReportService.reportEvent(reporterId, eventId, reason, description);
        res.status(201).json(report);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
});

// Báo cáo bài viết
router.post("/report/post", async (req, res) => {
    const { reporterId, postId, reason, description } = req.body;
    try {
        const report = await ReportService.reportPost(reporterId, postId, reason, description);
        res.status(201).json(report);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
});

// Lấy danh sách báo cáo theo target
router.get("/report/:targetType/:targetId", async (req, res) => {
    const { targetType, targetId } = req.params;
    const reportType = targetType === 'event' ? ReportTargetType.Event : ReportTargetType.Post;

    try {
        const reports = await ReportService.getReportsByTarget(targetId, reportType);
        res.json(reports);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
});

// Cập nhật trạng thái của báo cáo (resolved/rejected)
router.patch("/report/:reportId", async (req, res) => {
    const { reportId } = req.params;
    const { status } = req.body;

    try {
        const updatedReport = await ReportService.updateReportStatus(reportId, status);
        res.json(updatedReport);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Admin/Manager: Lấy danh sách báo cáo
router.get("/admin/all", authMiddleware, async (req, res) => {
    try {
        const user = (req as AuthenticatedRequest).user;
        const { status, type } = req.query;

        console.log(`[ReportRoutes] GET /admin/all - User: ${user.username} (${user.role})`);

        let reports: any[] = [];

        if (user.role === 'admin') {
            const filter: any = { targetType: { $in: [ReportTargetType.User, ReportTargetType.Event] } };
            if (status) filter.status = status;
            // Admin can optionally filter by type if provided in query, but restricted to User/Event
            if (type && (type === ReportTargetType.User || type === ReportTargetType.Event)) {
                filter.targetType = type;
            }
            reports = await ReportService.getAllReports(filter);
        } else if (user.role === 'manager') {
            reports = await ReportService.getReportsForManager(user._id.toString());
            // Client-side filtering for status if needed, or we could add it to service method
            if (status) {
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

export default router;
