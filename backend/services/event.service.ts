import { and, arrayContains, asc, desc, eq, gt, gte, ilike, inArray, lt, ne, or, sql, type SQL } from "drizzle-orm";
import createHttpError from "http-errors";
import { db } from "../db/client.ts";
import { eventStatus, events, posts, registrations, users } from "../db/schema.ts";
import { EventStatus } from "../models/Event.model.ts";
import { RegistrationStatus } from "../models/Registration.model.ts";
import { DiscussionModel } from "../models/Discussion.model.ts";
import { ReportModel, ReportTargetType } from "../models/Report.model.ts";
import { NotificationService } from "./notification.service.ts";
import { NotificationType } from "../models/Notification.model.ts";
import { UserRole } from "../types/user.ts";
import { assertMayManageEvent, getEventRow, toEvent } from "../utils/event.util.ts";
import { getPostRow, postLikerIds, toPost } from "../utils/post.util.ts";
import { containsPattern } from "../utils/sql.util.ts";
import { isUuid, toLean } from "../utils/user.util.ts";

/** The fields a create or update may set; anything else in the payload is ignored. */
type EventInput = Partial<Pick<typeof events.$inferInsert,
    "title" | "description" | "location" | "endAt" | "maxMembers" | "isPublic" | "tags" | "image">> & {
    startAt?: string | Date;
    endAt?: string | Date | null;
};

const toDate = (value: string | Date) => (value instanceof Date ? value : new Date(value));

/** Only the keys the caller actually sent, with the dates parsed. */
function pickEventFields(input: EventInput) {
    const { startAt, endAt, ...rest } = input;
    const picked: Partial<typeof events.$inferInsert> = {};
    for (const key of ["title", "description", "location", "maxMembers", "isPublic", "tags", "image"] as const) {
        if (rest[key] !== undefined) (picked as any)[key] = rest[key];
    }
    if (startAt !== undefined) picked.startAt = toDate(startAt);
    if (endAt !== undefined) picked.endAt = endAt === null ? null : toDate(endAt);
    return picked;
}

const approvedMemberIds = async (eventId: string) =>
    (await db.select({ id: registrations.volunteerId }).from(registrations)
        .where(and(eq(registrations.eventId, eventId), eq(registrations.status, RegistrationStatus.APPROVED))))
        .map((r) => r.id);

/** Reports are still on MongoDB until the reports ticket (10); they point at posts by id. */
async function countPendingPostReports(eventIds: string[]) {
    const counts = new Map<string, number>();
    if (!eventIds.length) return counts;

    const eventPosts = await db.select({ id: posts.id, eventId: posts.eventId }).from(posts)
        .where(inArray(posts.eventId, eventIds));
    const eventOfPost = new Map(eventPosts.map((p) => [p.id, p.eventId!]));
    if (!eventOfPost.size) return counts;

    const reports = await ReportModel.find({
        targetType: ReportTargetType.Post,
        targetId: { $in: [...eventOfPost.keys()] },
        status: "pending",
    }).select("targetId").lean();
    for (const r of reports) {
        const eventId = eventOfPost.get(String(r.targetId));
        if (eventId) counts.set(eventId, (counts.get(eventId) ?? 0) + 1);
    }
    return counts;
}

export const EventService = {
    /** The event's manager id, or null when the event does not exist. */
    async getManagerId(eventId: string) {
        const event = await getEventRow(eventId);
        return event ? event.managerId : null;
    },

    async getAllEvents() {
        const rows = await db.select().from(events).orderBy(desc(events.createdAt), asc(events.id));
        return rows.map(toEvent);
    },

    async createEvent(payload: EventInput, managerId: string) {
        const fields = pickEventFields(payload);
        if (!fields.title || !fields.startAt) throw createHttpError(400, "title and startAt are required");

        const [event] = await db.insert(events)
            .values({ ...fields, title: fields.title, startAt: fields.startAt, managerId })
            .returning();

        const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, UserRole.Admin));
        admins.forEach((admin) =>
            NotificationService.notify(admin.id, {
                type: NotificationType.EVENT_PENDING,
                title: "Event Pending Approval",
                body: `New event ${event!.title} is pending your approval`,
                data: { eventId: event!.id }
            })
        );
        return toEvent(event!);
    },

    async updateEvent(eventId: string, updates: EventInput, currentUserId: string, currentUserRole: string) {
        const event = await getEventRow(eventId);
        if (!event) throw createHttpError(404, "Event not found");
        assertMayManageEvent(event, currentUserId, currentUserRole);

        const [updated] = await db.update(events)
            .set({ ...pickEventFields(updates), updatedAt: new Date() })
            .where(eq(events.id, event.id))
            .returning();

        for (const volunteerId of await approvedMemberIds(event.id)) {
            NotificationService.notify(volunteerId, {
                type: NotificationType.EVENT_UPDATED,
                title: "Event Updated",
                body: `Event ${updated!.title} just got updated`,
                data: { eventId }
            });
        }

        return toEvent(updated!);
    },

    async getEventById(eventId: string, userId?: string) {
        const [found] = isUuid(eventId)
            ? await db.select({ event: events, manager: { id: users.id, name: users.name, email: users.email } })
                .from(events).innerJoin(users, eq(users.id, events.managerId))
                .where(eq(events.id, eventId))
            : [];
        if (!found) throw createHttpError(404, "Event not found");

        const { event, manager } = found;
        // managerId comes back populated, as the old populate("managerId", "name email") did.
        const body = { ...toEvent(event), managerId: toLean(manager) };

        if (!userId) {
            return { event: body, conflictingEvents: [], hasConflict: false };
        }

        const end = event.endAt ?? new Date("2999-12-31");
        const conflicts = await db.select({
            id: events.id, title: events.title, startAt: events.startAt, endAt: events.endAt, location: events.location,
        }).from(registrations)
            .innerJoin(events, eq(events.id, registrations.eventId))
            .where(and(
                eq(registrations.volunteerId, userId),
                inArray(registrations.status, [RegistrationStatus.APPROVED, RegistrationStatus.COMPLETED]),
                ne(events.id, event.id),
                eq(events.status, EventStatus.APPROVED),
                lt(events.startAt, end),
                gt(events.endAt, event.startAt),
            ))
            .orderBy(asc(events.startAt));

        const conflictingEvents = conflicts.map((c) => ({ ...toLean(c), id: c.id }));
        return { event: body, conflictingEvents, hasConflict: conflictingEvents.length > 0 };
    },

    async findEvents(
        filters: any = {},
        options: { page?: number; limit?: number } = {}
    ) {
        const page = Math.max(1, Math.floor(Number(options.page || 1)));
        const limit = Math.max(1, Math.min(100, Math.floor(Number(options.limit || 20))));

        const conditions: SQL[] = [];

        if (filters.q) {
            const pattern = containsPattern(String(filters.q));
            conditions.push(or(ilike(events.title, pattern), ilike(events.description, pattern))!);
        }

        if (filters.tag) conditions.push(arrayContains(events.tags, [String(filters.tag)]));

        if (filters.status) {
            // Unknown names match nothing, as they did; Postgres would reject them outright.
            const wanted = typeof filters.status === "string" ? filters.status.split(",") : [];
            const known = wanted.filter((s: string): s is (typeof eventStatus.enumValues)[number] =>
                (eventStatus.enumValues as readonly string[]).includes(s));
            conditions.push(known.length ? inArray(events.status, known) : sql`false`);
        }

        if (filters.startFrom) {
            const from = new Date(filters.startFrom);
            if (Number.isNaN(from.getTime())) throw createHttpError(400, "Invalid startFrom");
            conditions.push(gte(events.startAt, from));
        }

        if (filters.managerId) {
            conditions.push(isUuid(filters.managerId) ? eq(events.managerId, filters.managerId) : sql`false`);
        }

        const where = and(...conditions);

        const [rows, total] = await Promise.all([
            db.select().from(events).where(where)
                .orderBy(desc(events.startAt), asc(events.id)) // id breaks ties so pages don't shuffle
                .offset((page - 1) * limit)
                .limit(limit),
            db.$count(events, where),
        ]);

        const ids = rows.map((r) => r.id);
        const pending = ids.length
            ? await db.select({ eventId: registrations.eventId, volunteerId: registrations.volunteerId })
                .from(registrations)
                .where(and(inArray(registrations.eventId, ids), eq(registrations.status, RegistrationStatus.PENDING)))
                .orderBy(asc(registrations.createdAt), asc(registrations.id))
            : [];
        const reportCounts = await countPendingPostReports(ids);

        const items = rows.map((row) => ({
            ...toEvent(row),
            requests: pending.filter((p) => p.eventId === row.id).map((p) => ({ id: p.volunteerId })),
            pendingReportsCount: reportCounts.get(row.id) ?? 0,
        }));

        return { items, total, page, limit };
    },

    async approveEvent(eventId: string) {
        const event = await getEventRow(eventId);
        if (!event) throw createHttpError(404, "Event not found");
        if (event.status === EventStatus.APPROVED) return toEvent(event);

        const approved = await db.transaction(async (tx) => {
            // The manager is the event's first member, unless they are already registered.
            const [enrolled] = await tx.insert(registrations)
                .values({ eventId: event.id, volunteerId: event.managerId, status: RegistrationStatus.APPROVED })
                .onConflictDoNothing()
                .returning({ id: registrations.id });

            const [row] = await tx.update(events)
                .set({
                    status: EventStatus.APPROVED,
                    ...(enrolled ? { currentMembers: sql`${events.currentMembers} + 1` } : {}),
                    updatedAt: new Date(),
                })
                .where(eq(events.id, event.id))
                .returning();
            return row!;
        });

        await DiscussionModel.findOneAndUpdate(
            { eventId: approved.id },
            { eventId: approved.id },
            { upsert: true, new: true }
        );

        NotificationService.notify(approved.managerId, {
            type: NotificationType.EVENT_APPROVED,
            title: "Event Approved",
            body: `Your event ${approved.title} has been approved`,
            data: { eventId: approved.id }
        });
        return toEvent(approved);
    },

    async cancelEvent(eventId: string, reason?: string) {
        const event = await getEventRow(eventId);
        if (!event) throw createHttpError(404, "Event not found");

        const [cancelled] = await db.update(events)
            .set({ status: EventStatus.CANCELLED, updatedAt: new Date() })
            .where(eq(events.id, event.id))
            .returning();

        for (const volunteerId of await approvedMemberIds(event.id)) {
            NotificationService.notify(volunteerId, {
                type: NotificationType.EVENT_UPDATED,
                title: "Event Cancelled",
                body: `Event ${cancelled!.title} just got cancelled`,
                data: { eventId }
            });
        }

        return toEvent(cancelled!);
    },

    // The event's pinned post is the one with the `pinned` flag; pinning one unpins the rest.
    async pinPostOnEvent(eventId: string, postId: string, managerId: string, managerRole: string) {
        const event = await getEventRow(eventId);
        if (!event) throw createHttpError(404, "Event not found");
        assertMayManageEvent(event, managerId, managerRole);

        const post = await getPostRow(postId);
        if (!post) throw createHttpError(404, "Post not found");
        if (post.eventId !== event.id) throw createHttpError(400, "Post does not belong to event");
        const pinned = await db.transaction(async (tx) => {
            await tx.update(posts).set({ pinned: false })
                .where(and(eq(posts.eventId, event.id), eq(posts.pinned, true)));
            const [row] = await tx.update(posts).set({ pinned: true, updatedAt: new Date() })
                .where(eq(posts.id, post.id)).returning();
            return row!;
        });
        return toPost(pinned, (await postLikerIds([pinned.id])).get(pinned.id) ?? []);
    },

    async getEventStats(eventId: string, actorId: string, actorRole: string) {
        const event = await getEventRow(eventId);
        if (!event) throw createHttpError(404, "Event not found");
        assertMayManageEvent(event, actorId, actorRole);
        const [postsCount, regsCount] = await Promise.all([
            db.$count(posts, eq(posts.eventId, event.id)),
            db.$count(registrations, eq(registrations.eventId, event.id)),
        ]);
        return {
            postsCount,
            regsCount,
            currentMembers: event.currentMembers
        };
    },

    async deleteEvent(eventId: string, actorId: string, actorRole: string) {
        // Lookup and authorization sit outside the try: the catch below turns
        // everything into a 500, which would mask the 404 and the 403.
        const event = await getEventRow(eventId);
        if (!event) throw createHttpError(404, "Event not found");
        assertMayManageEvent(event, actorId, actorRole);

        try {
            // The registrations, posts and discussion go with the event (foreign keys).
            await db.delete(events).where(eq(events.id, event.id));

            return { message: "Event deleted successfully" };
        } catch (err) {
            console.log(err);
            throw createHttpError(500, "Failed to delete event");
        }
    },

    async completeEvent(eventId: string, actorId: string, actorRole: string) {
        const event = await getEventRow(eventId);
        if (!event) throw createHttpError(404, "Event not found");
        assertMayManageEvent(event, actorId, actorRole);

        const { finished, participants } = await db.transaction(async (tx) => {
            const [finished] = await tx.update(events)
                .set({ status: EventStatus.FINISHED, updatedAt: new Date() })
                .where(eq(events.id, event.id))
                .returning();
            // Everyone who was in the event is now a completed participant.
            const participants = await tx.update(registrations)
                .set({ status: RegistrationStatus.COMPLETED, completedAt: new Date(), updatedAt: new Date() })
                .where(and(eq(registrations.eventId, event.id), eq(registrations.status, RegistrationStatus.APPROVED)))
                .returning({ volunteerId: registrations.volunteerId });
            return { finished: finished!, participants };
        });

        for (const p of participants) {
            NotificationService.notify(p.volunteerId, {
                type: NotificationType.EVENT_COMPLETED,
                title: "Event Completed",
                body: `Event ${finished.title} has been marked as completed. Thank you for your participation!`,
                data: { eventId }
            });
        }

        return toEvent(finished);
    }
};
