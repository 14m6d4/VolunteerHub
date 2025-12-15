// Feed.service.ts
import { PostModel } from "../models/Post.model.ts";
import { EventModel } from "../models/Event.model.ts";
import { RegistrationModel, RegistrationStatus } from "../models/Registration.model.ts";
import mongoose from "mongoose";

export const FeedService = {
    async getFeed(userId: mongoose.Types.ObjectId, tab: "all" | "not-joined" | "joined") {
        let query = {};

        // Nếu là tab "Sự kiện chưa tham gia"
        if (tab === "not-joined") {
            // Lấy các sự kiện công khai mà người dùng chưa tham gia (dùng Registration để kiểm tra)
            const eventsNotJoined = await EventModel.find({
                isPublic: true, // Chỉ lấy sự kiện công khai
                status: { $in: [EventStatus.APPROVED, EventStatus.PENDING] } // Chỉ lấy các sự kiện đang được duyệt hoặc đã được duyệt
            });

            // Lọc những sự kiện mà người dùng chưa tham gia (dựa trên bảng Registration)
            const eventsNotJoinedIds = await RegistrationModel.find({
                volunteerId: { $ne: userId },
                eventId: { $in: eventsNotJoined.map((event) => event._id) }
            }).distinct("eventId");

            // Lấy các bài viết công khai và bài viết của sự kiện chưa tham gia
            query = {
                $or: [
                    { "eventId": { $in: eventsNotJoinedIds } }, // Bài viết thuộc sự kiện mà người dùng chưa tham gia
                    { "eventId": { $exists: false } }, // Bài viết công khai không gắn sự kiện
                ]
            };
        }

        // Nếu là tab "Sự kiện đã tham gia", lấy các bài viết trong các sự kiện mà người dùng đã tham gia
        if (tab === "joined") {
            // Lấy các sự kiện mà người dùng đã tham gia và đã được duyệt
            const registrations = await RegistrationModel.find({
                volunteerId: userId,
                status: RegistrationStatus.APPROVED // Người dùng đã được duyệt tham gia sự kiện
            }).populate("eventId");

            // Lấy các bài viết của các sự kiện đã tham gia và các bài viết công khai
            query = {
                $or: [
                    { "eventId": { $in: registrations.map((registration) => registration.eventId._id) } },
                    { "eventId": { $exists: false } }, // Bài viết công khai
                ]
            };
        }

        // Nếu là tab "All", lấy tất cả bài viết (công khai và riêng tư)
        if (tab === "all") {
            query = {};
        }

        // Tìm bài viết theo query
        const posts = await PostModel.find(query)
            .sort({ pinned: -1, createdAt: -1 }) // Sắp xếp theo pinned và thời gian tạo
            .populate("eventId", "title isPublic status") // Lấy thông tin sự kiện (nếu có)
            .populate("authorId", "name avatar") // Lấy thông tin người đăng bài
            .lean();

        // Chuyển đổi dữ liệu các tệp đính kèm (attachments)
        return posts.map(post => ({
            ...post,
            attachments: post.attachments?.map(att => ({
                ...att,
                url: `${process.env.SERVER_URL}/file/${att.fileId}`
            })) || []
        }));
    }
};
