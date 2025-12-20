// backend/services/feed.service.ts
import { PostModel } from "../models/Post.model.ts";
import { FeedType } from "../models/Feed.model.ts";
import { RegistrationModel } from "../models/Registration.model.ts";
import { EventModel } from "../models/Event.model.ts";

function calculateScore(feed, data, user) {
    let score = 0;
    const now = Date.now();

    if (feed.type === FeedType.POST) {
        score += 10;

        const hours = (now - new Date(feed.createdAt).getTime()) / 3600000;
        score += Math.max(0, 20 - hours);

        score += (data.likes?.length || 0) * 1.5;
    } else if (feed.type === 'trending') {
        score += 5;
        score += (data.currentMembers || 0) * 0.5;
    }
    return score;
}

export const FeedService = {
    async getFeed({ page = 1, limit = 20, tab = "all" }, user?) {
        try {
            const skip = (page - 1) * limit;
            let postQuery: any = {};
            let eventQuery: any = { status: "approved" };

            // Logic to identify joined events (for filtering posts AND excluding detailed events)
            let joinedEventIds: any[] = [];

            if (user) {
                const joinedRegs = await RegistrationModel.find({
                    volunteerId: user._id,
                    status: { $in: ["approved", "completed"] },
                }).select("eventId");
                joinedEventIds = joinedRegs.map(r => r.eventId);

                // 1. Posts: Only from joined events
                postQuery = { eventId: { $in: joinedEventIds } };

                // 2. Events: Only UNJOINED events (Recommendations)
                eventQuery._id = { $nin: joinedEventIds };
            } else {
                // Formatting for guests
                postQuery = { isPublic: true };
                // Events: All public approved events
                eventQuery.isPublic = true;
            }

            // A. Fetch Posts
            const postsPromise = PostModel.find(postQuery)
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(skip)
                .populate("authorId", "username name profilePicture role")
                .populate("eventId", "title image")
                .lean();
            const eventsPromise = EventModel.find(eventQuery)
                .sort({ currentMembers: -1, createdAt: -1 })
                .limit(5)
                .lean();

            const [posts, events] = await Promise.all([postsPromise, eventsPromise]);

            const postsWithComments = await Promise.all(posts.map(async (p: any) => {
                const comments = await (await import("../models/Comment.model.ts")).CommentModel.find({ postId: p._id })
                    .sort({ createdAt: -1 })
                    .limit(2)
                    .populate("authorId", "name profilePicture");

                const commentCount = await (await import("../models/Comment.model.ts")).CommentModel.countDocuments({ postId: p._id });

                return { ...p, comments, commentCount };
            }));

            const postItems = postsWithComments.map(p => ({
                type: "post",
                data: p,
                createdAt: p.createdAt
            }));

            const eventItems = events.map(e => ({
                type: "trending",
                data: e,
                createdAt: e.createdAt
            }));

            let combinedFeed = [...postItems, ...eventItems]
                .map(item => ({
                    ...item,
                    score: calculateScore(item, item.data, user),
                }))
                .sort((a, b) => b.score - a.score);

            return combinedFeed;
        } catch (error) {
            console.error('Error Feed:', error);
            throw error;
        }
    },
};
