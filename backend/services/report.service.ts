import { ReportModel, ReportTargetType } from "../models/Report.model.ts";
import { EventModel } from "../models/Event.model.ts";
import { eq, inArray } from "drizzle-orm";
import { db } from "../db/client.ts";
import { events, posts } from "../db/schema.ts";
import { isUuid } from "../utils/user.util.ts";
import { getPostRow } from "../utils/post.util.ts";
import { NotificationService } from "./notification.service.ts";
import { NotificationType } from "../models/Notification.model.ts";
import createHttpError from "http-errors";
import User from "../models/User.model.ts";
import { UserRole } from "../types/user.ts";

export const ReportService = {
    async reportEvent(reporterId: string, eventId: string, reason: string, description?: string) {
        const event = await EventModel.findById(eventId);
        if (!event) throw createHttpError(404, "Event not found");

        const report = await ReportModel.create({
            reporter: reporterId,
            targetId: String(event._id),
            targetType: ReportTargetType.Event,
            reason,
            ...(description ? { description } : {}),
            status: 'pending'
        });

        const admins = await User.find({ role: UserRole.Admin });
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
        const post = await getPostRow(postId);
        if (!post) throw createHttpError(404, "Post not found");

        const report = await ReportModel.create({
            reporter: reporterId,
            targetId: post.id,
            targetType: ReportTargetType.Post,
            reason,
            ...(description ? { description } : {}),
            status: 'pending'
        });

        if (post.eventId) {
            // The post's event lives in Postgres now.
            const [event] = isUuid(post.eventId)
                ? await db.select({ managerId: events.managerId }).from(events).where(eq(events.id, post.eventId))
                : [];
            if (event) {
                NotificationService.notify(event.managerId, {
                    type: NotificationType.POST_REPORTED,
                    title: "Post Reported",
                    body: `Post has been reported for the following reason: ${reason}`,
                    data: { postId: post.id, reportId: report._id }
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
            targetId: String(targetUser._id),
            targetType: ReportTargetType.User,
            reason,
            ...(description ? { description } : {}),
            status: 'pending'
        });

        const admins = await User.find({ role: UserRole.Admin });
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
                    const post = await getPostRow(report.targetId);
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
        const managed = await db.select({ id: events.id }).from(events).where(eq(events.managerId, managerId));
        const eventIds = managed.map(e => e.id);

        if (eventIds.length === 0) return [];

        const postIds = (await db.select({ id: posts.id }).from(posts).where(inArray(posts.eventId, eventIds))).map(p => p.id);

        if (postIds.length === 0) return [];

        return ReportModel.find({
            targetType: ReportTargetType.Post,
            targetId: { $in: postIds }
        })
            .populate('reporter', 'username name profilePicture')
            .sort({ createdAt: -1 });
    },

    async getReportsForEvent(eventId: string) {
        const postIds = isUuid(eventId)
            ? (await db.select({ id: posts.id }).from(posts).where(eq(posts.eventId, eventId))).map(p => p.id)
            : [];

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
                const post = await getPostRow(report.targetId);
                if (post && post.eventId) {
                    notificationData.eventId = post.eventId;
                    notificationData.postId = post.id;
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
                await db.delete(posts).where(eq(posts.id, report.targetId));
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
