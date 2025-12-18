// services/feed.service.ts
import { FeedModel, FeedType } from "../models/Feed.model.ts";
import { EventModel } from "../models/Event.model.ts";
import { PostModel } from "../models/Post.model.ts";

export const FeedService = {
    calculateScore(feed, data, user) {
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
    async getFeed(
        { page = 1, limit = 20 },
        user?: any
    ) {
        const skip = (page - 1) * limit;

        // 1️⃣ Lấy feed thô
        const feeds = await FeedModel.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // 2️⃣ Hydrate Event/Post
        const eventIds = feeds
            .filter(f => f.type === FeedType.EVENT)
            .map(f => f.refId);

        const postIds = feeds
            .filter(f => f.type === FeedType.POST)
            .map(f => f.refId);

        const [events, posts] = await Promise.all([
            EventModel.find({ _id: { $in: eventIds } }).lean(),
            PostModel.find({ _id: { $in: postIds } }).lean()
        ]);

        const eventMap = new Map(events.map(e => [e._id.toString(), e]));
        const postMap = new Map(posts.map(p => [p._id.toString(), p]));

        // 3️⃣ Build feedItems
        const feedItems = feeds.map(feed => {
            if (feed.type === FeedType.EVENT) {
                return {
                    feed,
                    data: eventMap.get(feed.refId.toString())
                };
            }
            return {
                feed,
                data: postMap.get(feed.refId.toString())
            };
        });

        // 🔥 4️⃣ TÍNH SCORE + SORT (CHỖ BẠN HỎI)
        const rankedFeed = feedItems
            .map(item => ({
                ...item,
                score: this.calculateScore(item.feed, item.data, user)
            }))
            .sort((a, b) => b.score - a.score);

        // 5️⃣ Format response
        return rankedFeed.map(item => ({
            type: item.feed.type,
            createdAt: item.feed.createdAt,
            data: item.data
        }));
    }
};
