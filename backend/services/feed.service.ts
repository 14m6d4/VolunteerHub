// backend/services/feed.service.ts
import { PostModel } from "../models/Post.model.ts";
import { FeedType } from "../models/Feed.model.ts";
import { RegistrationModel } from "../models/Registration.model.ts";
import { EventModel } from "../models/Event.model.ts";

function calculateScore(feed, data, user) {
    let score = 0;
    const now = Date.now();

    if (feed.type === FeedType.POST) {
        // Base score for posts
        score += 10;

        // Freshness
        const hours = (now - new Date(feed.createdAt).getTime()) / 3600000;
        score += Math.max(0, 20 - hours);

        // Engagement
        score += (data.likes?.length || 0) * 1.5;
    } else if (feed.type === 'trending') {
        // Score for trending events
        // Base score lower than fresh posts to let them intersperse
        score += 5;
        // Boost by member count (popularity)
        score += (data.currentMembers || 0) * 0.5;
        // Boost slightly if starting soon?
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
                .limit(limit) // Optimization: fetch 'limit' items of each type then mix? Or fetch more? 
                // Using 'limit' for each might over-fetch, but safe for mixing.
                // Should offset by skip? Mixing distinct streams with pagination is complex.
                // Simple approach: Fetch enough of both, mix, sort, then slice.
                // Ideally we shouldn't fetch ALL posts.
                // Let's rely on createdAt sort for posts and mix independent of deep pagination for now?
                // Actually, standard "feed" mixing usually pulls top N from each source.
                .skip(skip) // This assumes pure post pagination, merging with events later might mess up page continuity, but acceptable for dynamic feed.
                .populate("authorId", "username name profilePicture role")
                .populate("eventId", "title image")
                .lean();

            // B. Fetch Trending Events (Recommendations)
            // We want these to sprinkle in. Let's fetch top 5-10 per page request?
            const eventsPromise = EventModel.find(eventQuery)
                .sort({ currentMembers: -1, createdAt: -1 })
                .limit(5) // Limit trending injection
                .lean();

            const [posts, events] = await Promise.all([postsPromise, eventsPromise]);

            // Enrich posts with comments
            const postsWithComments = await Promise.all(posts.map(async (p: any) => {
                const comments = await (await import("../models/Comment.model.ts")).CommentModel.find({ postId: p._id })
                    .sort({ createdAt: -1 })
                    .limit(2)
                    .populate("authorId", "name profilePicture");

                const commentCount = await (await import("../models/Comment.model.ts")).CommentModel.countDocuments({ postId: p._id });

                return { ...p, comments, commentCount };
            }));

            // Create Feed Items
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

            // Mix and Sort
            let combinedFeed = [...postItems, ...eventItems]
                .map(item => ({
                    ...item,
                    score: calculateScore(item, item.data, user),
                }))
                .sort((a, b) => b.score - a.score);

            // Since we applied skip/limit to database queries separately, 
            // the combined results might exceed limit slightly or vary.
            // But usually we want to return exactly 'limit' items.
            // AND we already skipped 'posts'.
            // If we fetch 20 posts (page 2) and 5 events, we have 25 items.
            // We just return them? Or slice?
            // If we slice, we might lose posts that should have been on this page.
            // The user just wants "recommendations". 
            // Let's just return the combined list (up to limit + 5 is fine).

            return combinedFeed;
        } catch (error) {
            console.error('Error Feed:', error);
            throw error;
        }
    },
};
