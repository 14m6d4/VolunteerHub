import express from "express";
import { ReportService } from "../services/report.service.ts";
import { ReportTargetType } from "../models/Report.model.ts";

const router = express.Router();

// Báo cáo sự kiện
router.post("/event", async (req, res) => {
    const { reporterId, eventId, reason, description } = req.body;
    try {
        const report = await ReportService.reportEvent(reporterId, eventId, reason, description);
        res.status(201).json(report);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
});

// Báo cáo bài viết
router.post("/post", async (req, res) => {
    const { reporterId, postId, reason, description } = req.body;
    try {
        const report = await ReportService.reportPost(reporterId, postId, reason, description);
        res.status(201).json(report);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
});

// Lấy danh sách báo cáo theo target
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

// Cập nhật trạng thái của báo cáo (resolved/rejected)
router.patch("/:reportId", async (req, res) => {
    const { reportId } = req.params;
    const { status } = req.body;

    try {
        const updatedReport = await ReportService.updateReportStatus(reportId, status);
        res.json(updatedReport);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
});

// Admin: Lấy tất cả báo cáo
router.get("/admin/all", async (req, res) => {
    try {
        const { status, type } = req.query;
        const filter: any = {};
        if (status) filter.status = status;
        if (type) filter.targetType = type;

        const reports = await ReportService.getAllReports(filter);
        res.json(reports);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

export default router;
