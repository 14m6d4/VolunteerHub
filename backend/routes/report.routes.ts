import express from "express";
import { ReportService } from "../services/report.service.ts";
import { validateReportInput } from "../middlewares/validation.middleware.ts";

const router = express.Router();

// Báo cáo sự kiện
router.post("/report/event", validateReportInput, async (req, res) => {
    const { reporterId, eventId, reason, description } = req.body;
    try {
        const report = await ReportService.reportEvent(reporterId, eventId, reason, description);
        res.status(201).json(report);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Báo cáo bài viết
router.post("/report/post", validateReportInput, async (req, res) => {
    const { reporterId, postId, reason, description } = req.body;
    try {
        const report = await ReportService.reportPost(reporterId, postId, reason, description);
        res.status(201).json(report);
    } catch (error) {
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
    } catch (error) {
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

export default router;
