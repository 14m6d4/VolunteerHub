import type { IEvent } from "../models/Event.model.ts";
import { EventModel, EventStatus } from "../models/Event.model.ts";
import { DiscussionModel } from "../models/Discussion.model.ts";
import { PostModel } from "../models/Post.model.ts";
import { Types } from "mongoose";
import createHttpError from "http-errors";

export const EventService = {
    async getAllEvents() {
        return EventModel.find({}).sort({ createdAt: -1 });
    },

    async createEvent(payload: Partial<IEvent>, managerId: Types.ObjectId) {
        console.log("Start at:", payload.startAt);
        const event = await EventModel.create({ ...payload, managerId });
        if (event.status === EventStatus.APPROVED) {
            await DiscussionModel.findOneAndUpdate(
                { eventId: event._id },
                { eventId: event._id },
                { upsert: true, new: true }
            );
        }
        return event;
    },

    async updateEvent(eventId: string, updates: Partial<IEvent>, currentUserId: Types.ObjectId) {
        const event = await EventModel.findById(eventId);
        if (!event) throw createHttpError(404, "Event not found");
        Object.assign(event, updates);
        await event.save();
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

        console.log("Constructed query:", query);
        console.log(`Found ${total} events matching criteria.`);

        return { items, total, page, limit };
    },


    async approveEvent(eventId: string) {
        const event = await EventModel.findById(eventId);
        if (!event) throw createHttpError(404, "Event not found");
        if (event.status === EventStatus.APPROVED) return event;
        event.status = EventStatus.APPROVED;
        await event.save();
        await DiscussionModel.findOneAndUpdate(
            { eventId: event._id },
            { eventId: event._id },
            { upsert: true, new: true }
        );
        return event;
    },

    async cancelEvent(eventId: string, reason?: string) {
        const event = await EventModel.findById(eventId);
        if (!event) throw createHttpError(404, "Event not found");
        event.status = EventStatus.CANCELLED;
        await event.save();
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
    }
};
