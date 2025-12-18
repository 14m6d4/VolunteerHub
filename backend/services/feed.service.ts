

import { EventModel } from "../models/Event.model.ts";
import { PostModel } from "../models/Post.model.ts";
import { RegistrationModel } from "../models/Registration.model.ts";

function calculateScore(feed, data, user) {
    let score = 0;
    const now = Date.now();

    // Base score
    score += feed.type === FeedType.EVENT ? 30 : 10;

    // Freshness
    const hours =
        (now - new Date(feed.createdAt).getTime()) / 3600000;
    score += Math.max(0, 20 - hours);

    // Engagement
    if (feed.type === FeedType.POST) {
        score += (data.likes?.length || 0) * 1.5;
    }

    if (feed.type === FeedType.EVENT) {
        score += data.currentMembers || 0;
        if (
            data.startAt &&
            new Date(data.startAt).getTime() - now < 48 * 3600000
        ) {
            score += 15;
        }
    }

    return score;
}

export const FeedService = {
    async getFeed({ page = 1, limit = 20, tab = "all" }, user?) {
        const skip = (page - 1) * limit;

        let eventQuery: any = {};
        let postQuery: any = {};

        // 1️⃣ Filter theo tab
        if (tab === "unjoined") {
            if (user) {
                // Lấy eventIds user đã join
                const joinedRegs = await RegistrationModel.find({
                    volunteerId: user._id,
                    status: { $in: ["approved", "completed"] },
                }).select("eventId");

                const joinedEventIds = joinedRegs.map(r => r.eventId);

                eventQuery._id = { $nin: joinedEventIds }; // event chưa tham gia
            }
            postQuery.isPublic = true; // chỉ post public
        }

        if (tab === "joined") {
            if (user) {
                const joinedRegs = await RegistrationModel.find({
                    volunteerId: user._id,
                    status: { $in: ["approved", "completed"] },
                }).select("eventId");

                const joinedEventIds = joinedRegs.map(r => r.eventId);

                eventQuery._id = { $in: joinedEventIds }; // event đã tham gia
                // posts public hoặc thuộc event đã tham gia
                postQuery.$or = [
                    { isPublic: true },
                    { eventId: { $in: joinedEventIds } },
                ];
            } else {
                // Nếu không login, không có event joined
                eventQuery._id = { $in: [] };
                postQuery.isPublic = true;
            }
        }

        // tab === "all" => không filter gì thêm

        // 2️⃣ Query Event & Post
        const [events, posts] = await Promise.all([
            EventModel.find(eventQuery).lean(),
            PostModel.find(postQuery).lean(),
        ]);

        // 3️⃣ Build feed items
        const feedItems = [
            ...events.map(e => ({ type: "event", data: e, createdAt: e.createdAt })),
            ...posts.map(p => ({ type: "post", data: p, createdAt: p.createdAt })),
        ];

        // 4️⃣ Tính score & sort
        const rankedFeed = feedItems
            .map(item => ({
                ...item,
                score: calculateScore(item, user), // Hàm calculateScore giữ nguyên
            }))
            .sort((a, b) => b.score - a.score);

        // 5️⃣ Pagination
        const paged = rankedFeed.slice(skip, skip + limit);

        return paged;
    },
};

