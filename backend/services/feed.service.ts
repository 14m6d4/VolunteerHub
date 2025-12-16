// Feed.service.ts
import { PostModel } from "../models/Post.model.ts";
import { EventModel } from "../models/Event.model.ts";
import { RegistrationModel, RegistrationStatus } from "../models/Registration.model.ts";
import mongoose from "mongoose";

export const FeedService = {
    async getFeed(userId: mongoose.Types.ObjectId, filters: any = {}) {
        const tab = filters.tab;
        let query = {};

        if (tab === "not-joined") {
            const eventsNotJoined = await EventModel.find({
                isPublic: true,
                status: { $in: [EventStatus.APPROVED, EventStatus.PENDING] }
            });

            const eventsNotJoinedIds = await RegistrationModel.find({
                volunteerId: { $ne: userId },
                eventId: { $in: eventsNotJoined.map((event) => event._id) }
            }).distinct("eventId");

            query = {
                $or: [
                    { "eventId": { $in: eventsNotJoinedIds } },
                    { "eventId": { $exists: false } },
                ]
            };
        }

        if (tab === "joined") {
            const registrations = await RegistrationModel.find({
                volunteerId: userId,
                status: RegistrationStatus.APPROVED
            }).populate("eventId");

            query = {
                $or: [
                    { "eventId": { $in: registrations.map((registration) => registration.eventId._id) } },
                    { "eventId": { $exists: false } },
                ]
            };
        }

        if (tab === "all") {
            query = {};
        }

        const posts = await PostModel.find(query)
            .sort({ pinned: -1, createdAt: -1 })
            .populate("eventId", "title isPublic status")
            .populate("authorId", "name avatar")
            .lean();

        return posts.map(post => ({
            ...post,
            attachments: post.attachments?.map(att => ({
                ...att,
                url: `${process.env.SERVER_URL}/file/${att.fileId}`
            })) || []
        }));
    }
};
