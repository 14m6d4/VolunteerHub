import { ReportModel, ReportTargetType } from "../models/Report.model.ts";
import { EventModel } from "../models/Event.model.ts";
import { PostModel } from "../models/Post.model.ts";
import { NotificationService } from "./notification.service.ts";
import { NotificationType } from "../models/Notification.model.ts";
import createHttpError from "http-errors";
import User from "../models/User.model.ts";

export const ReportService = {
    async reportEvent(reporterId: string, eventId: string, reason: string, description?: string) {
        const event = await EventModel.findById(eventId);
        if (!event) throw createHttpError(404, "Event not found");

        const report = await ReportModel.create({
            reporter: reporterId,
            targetId: event._id,
            targetType: ReportTargetType.Event,
            reason,
            description,
            status: 'pending'
        });

        const admins = await User.find({ role: "admin" });
        admins.forEach(admin => {
            NotificationService.notify(admin._id.toString(), {
                type: NotificationType.EVENT_REPORTED,
                title: "Event Reported",
                body: `Event ${event.title} has been reported for the following reason: ${reason}`,
                data: { eventId: event._id, reportId: report._id }
            });
        });

        return report;
    },

    async reportPost(reporterId: string, postId: string, reason: string, description?: string) {
        const post = await PostModel.findById(postId);
        if (!post) throw createHttpError(404, "Post not found");

        const report = await ReportModel.create({
            reporter: reporterId,
            targetId: post._id,
            targetType: ReportTargetType.Post,
            reason,
            description,
            status: 'pending'
        });

        if (post.eventId) {
            const event = await EventModel.findById(post.eventId);
            if (event) {
                NotificationService.notify(event.managerId.toString(), {
                    type: NotificationType.POST_REPORTED,
                    title: "Post Reported",
                    body: `Post has been reported for the following reason: ${reason}`,
                    data: { postId: post._id, reportId: report._id }
                });
            }
        }

        return report;
    },

    async reportUser(reporterId: string, targetId: string, reason: string, description?: string) {
        const targetUser = await User.findById(targetId);
        if (!targetUser) throw createHttpError(404, "User not found");

        const report = await ReportModel.create({
            reporter: reporterId,
            targetId: targetUser._id,
            targetType: ReportTargetType.User,
            reason,
            description,
            status: 'pending'
        });

        const admins = await User.find({ role: "admin" });
        console.log(`[ReportService] reportUser: Found ${admins.length} admins to notify.`);

        admins.forEach(admin => {
            console.log(`[ReportService] Notifying admin: ${admin.username} (${admin._id})`);
            NotificationService.notify(admin._id.toString(), {
                type: NotificationType.USER_REPORTED,
                title: "User Reported",
                body: `User ${targetUser.username} has been reported. Reason: ${reason}`,
                data: { targetUserId: targetUser._id, reportId: report._id }
            });
        });

        return report;
    },

    async getAllReports(filter: any = {}) {
        const reports = await ReportModel.find(filter)
            .populate('reporter', 'username name profilePicture')
            .sort({ createdAt: -1 })
            .lean();

        const populatedReports = await Promise.all(
            reports.map(async (report: any) => {
                let targetDetails = null;

                if (report.targetType === ReportTargetType.User) {
                    const user = await User.findById(report.targetId).select('username name').lean();
                    targetDetails = user ? { username: user.username, name: user.name } : null;
                } else if (report.targetType === ReportTargetType.Event) {
                    const event = await EventModel.findById(report.targetId).select('title').lean();
                    targetDetails = event ? { title: event.title } : null;
                } else if (report.targetType === ReportTargetType.Post) {
                    const post = await PostModel.findById(report.targetId).select('content').lean();
                    targetDetails = post ? { contentPreview: post.content?.substring(0, 50) } : null;
                }

                return {
                    ...report,
                    targetDetails
                };
            })
        );

        return populatedReports;
    },

    async getReportsByTarget(targetId: string, targetType: ReportTargetType) {
        return ReportModel.find({ targetId, targetType }).sort({ createdAt: -1 });
    },

    async getReportsForManager(managerId: string) {
        const events = await EventModel.find({ managerId }).select('_id');
        const eventIds = events.map(e => e._id);

        if (eventIds.length === 0) return [];

        const posts = await PostModel.find({ eventId: { $in: eventIds } }).select('_id');
        const postIds = posts.map(p => p._id);

        if (postIds.length === 0) return [];

        return ReportModel.find({
            targetType: ReportTargetType.Post,
            targetId: { $in: postIds }
        })
            .populate('reporter', 'username name profilePicture')
            .sort({ createdAt: -1 });
    },

    async getReportsForEvent(eventId: string) {
        const posts = await PostModel.find({ eventId }).select('_id');
        const postIds = posts.map(p => p._id);

        if (postIds.length === 0) return [];

        return ReportModel.find({
            targetType: ReportTargetType.Post,
            targetId: { $in: postIds }
        })
            .populate('reporter', 'username name profilePicture')
            .sort({ createdAt: -1 });
    },

    async updateReportStatus(reportId: string, status: 'resolved' | 'rejected') {
        const report = await ReportModel.findById(reportId).populate('reporter', 'username');
        if (!report) throw createHttpError(404, "Report not found");

        report.status = status;
        await report.save();

        try {
            const notificationTitle = status === 'resolved'
                ? 'Report Resolved'
                : 'Report Rejected';
            const notificationBody = status === 'resolved'
                ? `Your report has been resolved. Action has been taken.`
                : `Your report has been reviewed and rejected.`;

            let notificationData: any = { reportId: report._id.toString(), targetType: report.targetType, targetId: report.targetId.toString() };

            if (report.targetType === ReportTargetType.Post) {
                const post = await PostModel.findById(report.targetId);
                if (post && post.eventId) {
                    notificationData.eventId = post.eventId.toString();
                    notificationData.postId = post._id.toString();
                }
            } else if (report.targetType === ReportTargetType.Event) {
                notificationData.eventId = report.targetId.toString();
            }

            await NotificationService.notify(report.reporter._id.toString(), {
                type: status === 'resolved' ? NotificationType.REPORT_RESOLVED : NotificationType.REPORT_REJECTED,
                title: notificationTitle,
                body: notificationBody,
                data: notificationData
            });
        } catch (err) {
            console.error("Failed to notify reporter about report status:", err);
        }

        if (status === 'resolved' && report.targetType === ReportTargetType.Post) {
            try {
                await PostModel.findByIdAndDelete(report.targetId);
                console.log(`[ReportService] Deleted post ${report.targetId} due to resolved report #${report._id}`);
            } catch (err) {
                console.error("Failed to delete post after report resolve:", err);
            }
        }

        if (status === 'resolved' && report.targetType === ReportTargetType.User) {
            try {
                const { banUserService } = await import('./user.service.ts');
                await banUserService(report.targetId.toString(), `Banned due to Report #${report._id}: ${report.reason}`);
            } catch (err) {
                console.error("Failed to auto-ban user after report resolve:", err);
            }
        }

        return report;
    }
};
