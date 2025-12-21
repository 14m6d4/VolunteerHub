import type { IEvent } from "../models/Event.model.ts";
import { EventModel, EventStatus } from "../models/Event.model.ts";
import { DiscussionModel } from "../models/Discussion.model.ts";
import { PostModel } from "../models/Post.model.ts";
import { Types } from "mongoose";
import { RegistrationModel, RegistrationStatus } from "../models/Registration.model.ts";
import { NotificationService } from "./notification.service.ts";
import { NotificationType } from "../models/Notification.model.ts";
import User from "../models/User.model.ts";
import createHttpError from "http-errors";

export const EventService = {
    async getAllEvents() {
        return EventModel.find({}).sort({ createdAt: -1 });
    },

    async createEvent(payload: Partial<IEvent>, managerId: Types.ObjectId) {
        try {


            console.log("Start at:", payload.startAt);
            const event = await EventModel.create({ ...payload, managerId });
            if (event.status === EventStatus.APPROVED) {
                await DiscussionModel.findOneAndUpdate(
                    { eventId: event._id },
                    { upsert: true, new: true }
                );
            }
            const admins = await User.find({ role: "admin" });
            admins.forEach(admin =>
                NotificationService.notify(admin._id, {
                    type: NotificationType.EVENT_PENDING,
                    title: "Event Pending Approval",
                    body: `New event ${event.title} is pending your approval`,
                    data: { eventId: event._id }
                })
            );
            console.log("Event created:", event);
            return event;
        } catch (error) {
            console.log("Error creating event:", error);
            throw error;
        }
    },

    async updateEvent(eventId: string, updates: Partial<IEvent>, currentUserId: Types.ObjectId) {
        const event = await EventModel.findById(eventId);
        if (!event) throw createHttpError(404, "Event not found");
        Object.assign(event, updates);
        await event.save();

        const members = await RegistrationModel.find({
            eventId,
            status: "approved"
        });

        for (const m of members) {
            NotificationService.notify(m.volunteerId, {
                type: NotificationType.EVENT_UPDATED,
                title: "Event Updated",
                body: `Event ${event.title} just got updated`,
                data: { eventId }
            });
        }

        return event;
    },

    async getEventById(eventId: string, userId?: Types.ObjectId) {
        const event = await EventModel.findById(eventId)
            .populate("managerId", "name email");

        if (!event) throw createHttpError(404, "Event not found");

        if (!userId) {
            return {
                event,
                conflictingEvents: [],
                hasConflict: false
            };
        }

        const registrations = await RegistrationModel.find({
            volunteerId: userId,
            status: { $in: [RegistrationStatus.APPROVED, RegistrationStatus.COMPLETED] }
        }).select("eventId");

        if (!registrations.length) {
            return {
                event,
                conflictingEvents: [],
                hasConflict: false
            };
        }

        const joinedEventIds = registrations.map(r => r.eventId);

        const start = event.startAt;
        const end = event.endAt ?? new Date("2999-12-31");

        const conflictingEvents = await EventModel.find({
            _id: {
                $in: joinedEventIds,
                $ne: event._id
            },
            status: EventStatus.APPROVED,
            startAt: { $lt: end },
            endAt: { $gt: start }
        })
            .select("title startAt endAt location")
            .sort({ startAt: 1 });

        return {
            event,
            conflictingEvents,
            hasConflict: conflictingEvents.length > 0
        };
    },

    async findEvents(
        filters: any = {},
        options: { page?: number; limit?: number } = {}
    ) {
        const page = Number(options.page || 1);
        const limit = Math.min(100, Number(options.limit || 20));
        const skip = (page - 1) * limit;

        const query: any = {};

        if (filters.q) {
            query.$text = { $search: filters.q };
        }

        if (filters.tag) query.tags = filters.tag;

        if (filters.status) {
            if (typeof filters.status === "string" && filters.status.includes(",")) {
                query.status = { $in: filters.status.split(",") };
            } else {
                query.status = filters.status;
            }
        }

        if (filters.startFrom) {
            query.startAt = { $gte: new Date(filters.startFrom) };
        }

        if (filters.managerId) {
            query.managerId = filters.managerId;
        }

        const [items, total] = await Promise.all([
            EventModel.find(query).sort({ startAt: 1 }).skip(skip).limit(limit),
            EventModel.countDocuments(query)
        ]);

        // Populate pending requests if we are listing for a manager or generally
        // This is needed for the frontend ManagerEventCard to show pending request count
        const itemsWithRequests = await Promise.all(items.map(async (item) => {
            const eventObj = item.toObject();

            // Use dynamic import to be consistent with other methods in this file or avoid circular deps
            const RegistrationModel = (await import("../models/Registration.model.ts")).RegistrationModel;
            const RegistrationStatus = (await import("../models/Registration.model.ts")).RegistrationStatus;

            const pendingRegs = await RegistrationModel.find({
                eventId: item._id,
                status: RegistrationStatus.PENDING
            }).select('volunteerId');

            // Attach requests array (mocking User objects with just ID to satisfy length check and basic existence)
            // Frontend assumes requests is User[]. We provide minimal object.
            (eventObj as any).requests = pendingRegs.map(r => ({
                id: r.volunteerId,
                // We could fetch names here if needed, but for the card badge, length is enough
            }));

            // Calculate pending reports for posts in this event
            const PostModel = (await import("../models/Post.model.ts")).PostModel;
            const ReportModel = (await import("../models/Report.model.ts")).ReportModel;

            // Get all post IDs for this event
            const posts = await PostModel.find({ eventId: item._id }).select('_id');
            const postIds = posts.map(p => p._id);

            // Count pending reports targeting these posts
            const pendingReportsCount = await ReportModel.countDocuments({
                targetType: 'post',
                targetId: { $in: postIds },
                status: 'pending'
            });

            (eventObj as any).pendingReportsCount = pendingReportsCount;

            return eventObj;
        }));

        console.log("Constructed query:", query);
        console.log(`Found ${total} events matching criteria.`);

        return { items: itemsWithRequests, total, page, limit };

    },


    async approveEvent(eventId: string) {
        const event = await EventModel.findById(eventId);
        if (!event) throw createHttpError(404, "Event not found");
        if (event.status === EventStatus.APPROVED) return event;

        event.status = EventStatus.APPROVED;

        // Add manager as the first member
        try {
            await RegistrationModel.create({
                eventId: event._id,
                volunteerId: event.managerId,
                status: RegistrationStatus.APPROVED
            });
            event.currentMembers += 1;
        } catch (error: any) {
            if (error.code !== 11000) {
                console.error("Failed to register manager for event approval:", error);
            }
        }

        await event.save();

        await DiscussionModel.findOneAndUpdate(
            { eventId: event._id },
            { eventId: event._id },
            { upsert: true, new: true }
        );

        NotificationService.notify(event.managerId, {
            type: NotificationType.EVENT_APPROVED,
            title: "Event Approved",
            body: `Your event ${event.title} has been approved`,
            data: { eventId: event._id }
        });
        return event;
    },

    async cancelEvent(eventId: string, reason?: string) {
        const event = await EventModel.findById(eventId);
        if (!event) throw createHttpError(404, "Event not found");
        event.status = EventStatus.CANCELLED;
        await event.save();

        const members = await RegistrationModel.find({
            eventId,
            status: RegistrationStatus.APPROVED
        });

        for (const m of members) {
            NotificationService.notify(m.volunteerId, {
                type: NotificationType.EVENT_UPDATED,
                title: "Event Cancelled",
                body: `Event ${event.title} just got cancelled`,
                data: { eventId }
            });
        }

        return event;
    },


    async pinPostOnEvent(eventId: string, postId: string, managerId: Types.ObjectId) {
        const post = await PostModel.findById(postId);
        if (!post) throw createHttpError(404, "Post not found");
        if (!post.eventId?.equals(eventId)) throw createHttpError(400, "Post does not belong to event");
        await PostModel.updateMany({ eventId, pinned: true }, { pinned: false });
        post.pinned = true;
        await post.save();
        await EventModel.findByIdAndUpdate(eventId, { pinnedPostId: post._id });
        return post;
    },

    async getEventStats(eventId: string) {
        const event = await EventModel.findById(eventId);
        if (!event) throw createHttpError(404, "Event not found");
        const postsCount = await PostModel.countDocuments({ eventId });
        const regsCount = await (await import("../models/Registration.model.ts")).RegistrationModel.countDocuments({ eventId });
        return {
            postsCount,
            regsCount,
            currentMembers: event.currentMembers
        };
    },

    async deleteEvent(eventId: string) {
        try {
            const event = await EventModel.findById(eventId);
            if (!event) throw createHttpError(404, "Event not found");

            // Delete associated data
            await Promise.all([
                DiscussionModel.deleteOne({ eventId }),
                PostModel.deleteMany({ eventId }),
                (await import("../models/Registration.model.ts")).RegistrationModel.deleteMany({ eventId }),
                EventModel.findByIdAndDelete(eventId)
            ]);

            return { message: "Event deleted successfully" };
        } catch (err) {
            console.log(err);
            throw createHttpError(500, "Failed to delete event");
        }
    },
    async completeEvent(eventId: string) {
        const event = await EventModel.findById(eventId);
        if (!event) throw createHttpError(404, "Event not found");

        // Update event status
        event.status = EventStatus.FINISHED;
        await event.save();

        // Update all approved registrations to completed
        const RegistrationModel = (await import("../models/Registration.model.ts")).RegistrationModel;
        const RegistrationStatus = (await import("../models/Registration.model.ts")).RegistrationStatus;

        await RegistrationModel.updateMany(
            { eventId: event._id, status: RegistrationStatus.APPROVED },
            {
                status: RegistrationStatus.COMPLETED,
                completedAt: new Date()
            }
        );

        // Notify participants
        const participants = await RegistrationModel.find({ eventId: event._id, status: RegistrationStatus.COMPLETED });
        for (const p of participants) {
            NotificationService.notify(p.volunteerId, {
                type: NotificationType.EVENT_COMPLETED,
                title: "Event Completed",
                body: `Event ${event.title} has been marked as completed. Thank you for your participation!`,
                data: { eventId }
            });
        }

        return event;
    }
};
