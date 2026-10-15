import { and, desc, eq, inArray } from "drizzle-orm";
import createHttpError from "http-errors";
import { db } from "../db/client.ts";
import { events, posts, reports, reportStatus, users } from "../db/schema.ts";
import { NotificationType } from "../types/notification.ts";
import { ReportTargetType, type ReportStatus } from "../types/report.ts";
import { UserRole } from "../types/user.ts";
import { getEventRow } from "../utils/event.util.ts";
import { getPostRow } from "../utils/post.util.ts";
import { toReport } from "../utils/report.util.ts";
import { isUuid, toLean } from "../utils/user.util.ts";
import { deleteImages } from "./image.service.ts";
import { type Actor, ModerationService } from "./moderation.service.ts";
import { NotificationService } from "./notification.service.ts";

const REPORTER = { id: users.id, username: users.username, name: users.name, profilePicture: users.profilePicture };

async function file(reporterId: string, targetType: ReportTargetType, targetId: string, reason: string, description?: string) {
    const [row] = await db.insert(reports).values({
        reporterId, targetId, targetType, reason, description: description || null,
    }).returning();
    return row!;
}

async function adminIds() {
    return (await db.select({ id: users.id }).from(users).where(eq(users.role, UserRole.Admin))).map((a) => a.id);
}

/** Newest first, with the reporter populated as {_id, username, name, profilePicture}. */
async function listReports(where: ReturnType<typeof and>) {
    const rows = await db.select({ report: reports, reporter: REPORTER }).from(reports)
        .innerJoin(users, eq(users.id, reports.reporterId))
        .where(where)
        .orderBy(desc(reports.createdAt), desc(reports.id));
    return rows.map((r) => toReport(r.report, toLean(r.reporter)));
}

const postReportsOf = (postIds: string[]) =>
    postIds.length
        ? listReports(and(eq(reports.targetType, ReportTargetType.Post), inArray(reports.targetId, postIds)))
        : [];

/** The posts of these events. */
async function postIdsOf(eventIds: string[]) {
    if (!eventIds.length) return [];
    return (await db.select({ id: posts.id }).from(posts).where(inArray(posts.eventId, eventIds))).map((p) => p.id);
}

/** Reports of the given kinds, optionally of one status, each with a summary of what it points at. */
async function withDetails(targetTypes: ReportTargetType[], status?: string) {
    if (status && !(reportStatus.enumValues as string[]).includes(status)) return [];

    const found = await listReports(and(
        inArray(reports.targetType, targetTypes),
        status ? eq(reports.status, status as ReportStatus) : undefined,
    ));

    const idsOf = (type: ReportTargetType) =>
        [...new Set(found.filter((r) => r.targetType === type).map((r) => r.targetId as string))];
    const userIds = idsOf(ReportTargetType.User);
    const eventIds = idsOf(ReportTargetType.Event);
    const postIds = idsOf(ReportTargetType.Post);
    const targetUsers = userIds.length
        ? await db.select({ id: users.id, username: users.username, name: users.name }).from(users).where(inArray(users.id, userIds))
        : [];
    const targetEvents = eventIds.length
        ? await db.select({ id: events.id, title: events.title }).from(events).where(inArray(events.id, eventIds))
        : [];
    const targetPosts = postIds.length
        ? await db.select({ id: posts.id, content: posts.content }).from(posts).where(inArray(posts.id, postIds))
        : [];

    return found.map((report) => {
        let targetDetails = null;
        if (report.targetType === ReportTargetType.User) {
            const user = targetUsers.find((u) => u.id === report.targetId);
            targetDetails = user ? { username: user.username, name: user.name } : null;
        } else if (report.targetType === ReportTargetType.Event) {
            const event = targetEvents.find((e) => e.id === report.targetId);
            targetDetails = event ? { title: event.title } : null;
        } else if (report.targetType === ReportTargetType.Post) {
            const post = targetPosts.find((p) => p.id === report.targetId);
            targetDetails = post ? { contentPreview: post.content?.substring(0, 50) } : null;
        }
        return { ...report, targetDetails };
    });
}

export const ReportService = {
    async reportEvent(reporterId: string, eventId: string, reason: string, description?: string) {
        const event = await getEventRow(eventId);
        if (!event) throw createHttpError(404, "Event not found");

        const report = await file(reporterId, ReportTargetType.Event, event.id, reason, description);

        await Promise.all((await adminIds()).map((adminId) =>
            NotificationService.notify(adminId, {
                type: NotificationType.EVENT_REPORTED,
                title: "Event Reported",
                body: `Event ${event.title} has been reported for the following reason: ${reason}`,
                data: { eventId: event.id, reportId: report.id }
            })));

        return toReport(report);
    },

    async reportPost(reporterId: string, postId: string, reason: string, description?: string) {
        const post = await getPostRow(postId);
        if (!post) throw createHttpError(404, "Post not found");

        const report = await file(reporterId, ReportTargetType.Post, post.id, reason, description);

        if (post.eventId) {
            const [event] = await db.select({ managerId: events.managerId }).from(events).where(eq(events.id, post.eventId));
            if (event) {
                await NotificationService.notify(event.managerId, {
                    type: NotificationType.POST_REPORTED,
                    title: "Post Reported",
                    body: `Post has been reported for the following reason: ${reason}`,
                    data: { postId: post.id, reportId: report.id }
                });
            }
        }

        return toReport(report);
    },

    async reportUser(reporterId: string, targetId: string, reason: string, description?: string) {
        const [targetUser] = isUuid(targetId)
            ? await db.select({ id: users.id, username: users.username }).from(users).where(eq(users.id, targetId))
            : [];
        if (!targetUser) throw createHttpError(404, "User not found");

        const report = await file(reporterId, ReportTargetType.User, targetUser.id, reason, description);

        await Promise.all((await adminIds()).map((adminId) =>
            NotificationService.notify(adminId, {
                type: NotificationType.USER_REPORTED,
                title: "User Reported",
                body: `User ${targetUser.username} has been reported. Reason: ${reason}`,
                data: { targetUserId: targetUser.id, reportId: report.id }
            })));

        return toReport(report);
    },

    /** Admins see reports about users and events; managers the reports about posts in events they run. */
    async listForActor(actor: Actor, { status, type }: { status?: string; type?: string }) {
        const wanted = status && status !== 'all' ? status : undefined;
        if (actor.role === UserRole.Admin) {
            // Post reports are the managers' to handle.
            const targetTypes = type === ReportTargetType.User || type === ReportTargetType.Event
                ? [type]
                : [ReportTargetType.User, ReportTargetType.Event];
            return withDetails(targetTypes, wanted);
        }
        if (actor.role !== UserRole.Manager) throw createHttpError(403, "Forbidden");

        const managed = await db.select({ id: events.id }).from(events).where(eq(events.managerId, actor.id));
        const found = await postReportsOf(await postIdsOf(managed.map((e) => e.id)));
        return wanted ? found.filter((r) => r.status === wanted) : found;
    },

    /** The reports about posts in one event, for its moderators: 404 for an unknown event, 403 for anyone else. */
    async listForEvent(actor: Actor, eventId: string) {
        await ModerationService.assertModerator(actor, { eventId });
        return postReportsOf(await postIdsOf(isUuid(eventId) ? [eventId] : []));
    },

    /** Every report about one event, or else about one post. */
    async listForTarget(targetType: string, targetId: string) {
        if (!isUuid(targetId)) return [];
        const type = targetType === ReportTargetType.Event ? ReportTargetType.Event : ReportTargetType.Post;
        const rows = await db.select().from(reports)
            .where(and(eq(reports.targetId, targetId), eq(reports.targetType, type)))
            .orderBy(desc(reports.createdAt), desc(reports.id));
        return rows.map((r) => toReport(r));
    },

    /** Resolves or rejects a report: 400 for any other status, 404 for an unknown report, 403 unless the actor may handle it. */
    async setStatus(actor: Actor, reportId: string, status: unknown) {
        if (status !== 'resolved' && status !== 'rejected') throw createHttpError(400, "Status must be resolved or rejected");

        const [report] = isUuid(reportId) ? await db.select().from(reports).where(eq(reports.id, reportId)) : [];
        if (!report) throw createHttpError(404, "Report not found");
        if (actor.role !== UserRole.Admin) throw createHttpError(403, "You may not handle this report");

        const [updated] = await db.update(reports).set({ status, updatedAt: new Date() }).where(eq(reports.id, report.id)).returning();
        if (!updated) throw createHttpError(404, "Report not found");
        const [reporter] = await db.select({ id: users.id, username: users.username }).from(users).where(eq(users.id, updated.reporterId));

        try {
            const notificationTitle = status === 'resolved'
                ? 'Report Resolved'
                : 'Report Rejected';
            const notificationBody = status === 'resolved'
                ? `Your report has been resolved. Action has been taken.`
                : `Your report has been reviewed and rejected.`;

            let notificationData: any = { reportId: updated.id, targetType: updated.targetType, targetId: updated.targetId };

            if (updated.targetType === ReportTargetType.Post) {
                const post = await getPostRow(updated.targetId);
                if (post && post.eventId) {
                    notificationData.eventId = post.eventId;
                    notificationData.postId = post.id;
                }
            } else if (updated.targetType === ReportTargetType.Event) {
                notificationData.eventId = updated.targetId;
            }

            await NotificationService.notify(updated.reporterId, {
                type: status === 'resolved' ? NotificationType.REPORT_RESOLVED : NotificationType.REPORT_REJECTED,
                title: notificationTitle,
                body: notificationBody,
                data: notificationData
            });
        } catch (err) {
            console.error("Failed to notify reporter about report status:", err);
        }

        if (status === 'resolved' && updated.targetType === ReportTargetType.Post) {
            try {
                const [deleted] = await db.delete(posts).where(eq(posts.id, updated.targetId)).returning({ image: posts.image });
                await deleteImages(deleted?.image);
                console.log(`[ReportService] Deleted post ${updated.targetId} due to resolved report #${updated.id}`);
            } catch (err) {
                console.error("Failed to delete post after report resolve:", err);
            }
        }

        if (status === 'resolved' && updated.targetType === ReportTargetType.User) {
            try {
                const { banUserService } = await import('./user.service.ts');
                await banUserService(updated.targetId, `Banned due to Report #${updated.id}: ${updated.reason}`);
            } catch (err) {
                console.error("Failed to auto-ban user after report resolve:", err);
            }
        }

        return toReport(updated, reporter ? toLean(reporter) : undefined);
    }
};
