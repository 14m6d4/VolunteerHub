import { ReportModel, ReportTargetType } from "../models/Report.model.ts";
import { EventModel } from "../models/Event.model.ts";
import { PostModel } from "../models/Post.model.ts";
import { NotificationService } from "./notification.service.ts";
import { NotificationType } from "../models/Notification.model.ts";
import createHttpError from "http-errors";
import User from "../models/User.model.ts";

export const ReportService = {
    // Báo cáo sự kiện
    async reportEvent(reporterId: string, eventId: string, reason: string, description?: string) {
        // Kiểm tra sự kiện có tồn tại không
        const event = await EventModel.findById(eventId);
        if (!event) throw createHttpError(404, "Event not found");

        // Tạo báo cáo
        const report = await ReportModel.create({
            reporter: reporterId,
            targetId: event._id,
            targetType: ReportTargetType.Event,
            reason,
            description,
            status: 'pending'
        });

        // Gửi thông báo cho admin
        const admins = await User.find({ role: "admin" });
        admins.forEach(admin => {
            NotificationService.notify(admin._id, {
                type: NotificationType.EVENT_REPORTED,
                title: "Event Reported",
                body: `Event ${event.title} has been reported for the following reason: ${reason}`,
                data: { eventId: event._id, reportId: report._id }
            });
        });

        return report;
    },

    // Báo cáo bài viết
    async reportPost(reporterId: string, postId: string, reason: string, description?: string) {
        // Kiểm tra bài viết có tồn tại không
        const post = await PostModel.findById(postId);
        if (!post) throw createHttpError(404, "Post not found");

        // Tạo báo cáo
        const report = await ReportModel.create({
            reporter: reporterId,
            targetId: post._id,
            targetType: ReportTargetType.Post,
            reason,
            description,
            status: 'pending'
        });

        // Gửi thông báo cho manager của event (nếu có)
        if (post.eventId) {
            const event = await EventModel.findById(post.eventId);
            if (event) {
                NotificationService.notify(event.managerId, {
                    type: NotificationType.POST_REPORTED,
                    title: "Post Reported",
                    body: `Post has been reported for the following reason: ${reason}`,
                    data: { postId: post._id, reportId: report._id }
                });
            }
        }

        return report;
    },

    // Báo cáo người dùng
    async reportUser(reporterId: string, targetId: string, reason: string, description?: string) {
        // Kiểm tra user có tồn tại không
        const targetUser = await User.findById(targetId);
        if (!targetUser) throw createHttpError(404, "User not found");

        // Tạo báo cáo
        const report = await ReportModel.create({
            reporter: reporterId,
            targetId: targetUser._id,
            targetType: ReportTargetType.User,
            reason,
            description,
            status: 'pending'
        });

        // Gửi thông báo cho admin
        const admins = await User.find({ role: "admin" });
        admins.forEach(admin => {
            NotificationService.notify(admin._id, {
                type: NotificationType.USER_REPORTED,
                title: "User Reported",
                body: `User ${targetUser.username} has been reported. Reason: ${reason}`,
                data: { targetUserId: targetUser._id, reportId: report._id }
            });
        });

        return report;
    },

    // Lấy tất cả báo cáo (dành cho admin page)
    async getAllReports(filter: any = {}) {
        return ReportModel.find(filter)
            .populate('reporter', 'username name profilePicture')
            .sort({ createdAt: -1 });
    },

    // Lấy các báo cáo theo target (Event, Post)
    async getReportsByTarget(targetId: string, targetType: ReportTargetType) {
        return ReportModel.find({ targetId, targetType }).sort({ createdAt: -1 });
    },

    // Cập nhật trạng thái của báo cáo (resolved, rejected)
    async updateReportStatus(reportId: string, status: 'resolved' | 'rejected') {
        const report = await ReportModel.findById(reportId);
        if (!report) throw createHttpError(404, "Report not found");

        report.status = status;
        await report.save();

        // If resolving a user report, ban the user automatically
        if (status === 'resolved' && report.targetType === ReportTargetType.User) {
            try {
                // Dynamically import to avoid potential circular dependency issues if any arise, 
                // though currently user.service.ts doesn't import ReportService.
                const { banUserService } = await import('./user.service.ts');
                await banUserService(report.targetId.toString(), `Banned due to Report #${report._id}: ${report.reason}`);
            } catch (err) {
                console.error("Failed to auto-ban user after report resolve:", err);
            }
        }

        return report;
    }
};
