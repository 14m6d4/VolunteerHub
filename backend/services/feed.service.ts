import { PostModel } from "../models/Post.model.ts";
import { FeedType } from "../models/Feed.model.ts";

function calculateScore(feed, data, user) {
    let score = 0;
    const now = Date.now();

    // Base score
    score += feed.type === FeedType.POST ? 10 : 0;  // Chỉ tính điểm cho bài post

    // Freshness
    const hours =
        (now - new Date(feed.createdAt).getTime()) / 3600000;
    score += Math.max(0, 20 - hours);

    // Engagement
    if (feed.type === FeedType.POST) {
        score += (data.likes?.length || 0) * 1.5;
    }

    return score;
}

export const FeedService = {
    async getFeed({ page = 1, limit = 20, tab = "all" }, user?) {
        try {
            const skip = (page - 1) * limit;

            let postQuery: any = {};

            if (tab === "unjoined") {
                postQuery.isPublic = true; // Tìm các bài post công khai
            }

            if (tab === "joined") {
                if (user) {
                    const joinedRegs = await RegistrationModel.find({
                        volunteerId: user._id,
                        status: { $in: ["approved", "completed"] },
                    }).select("eventId");

                    const joinedEventIds = joinedRegs.map(r => r.eventId);
                    postQuery.$or = [
                        { isPublic: true },
                        { eventId: { $in: joinedEventIds } },
                    ];
                } else {
                    postQuery.isPublic = true;
                }
            }

            // Chỉ lấy bài post từ PostModel
            const posts = await PostModel.find(postQuery)
                .sort({ createdAt: -1 }) // Đảm bảo lấy các bài post mới nhất
                .populate("authorId", "username name profilePicture")
                .lean();
            const feedItems = posts.map(p => ({
                type: "post",
                data: p,
                createdAt: p.createdAt
            }));

            const rankedFeed = feedItems
                .map(item => ({
                    ...item,
                    score: calculateScore(item, item.data, user), // Tính điểm cho bài post
                }))
                .sort((a, b) => b.score - a.score);

            const paged = rankedFeed.slice(skip, skip + limit);
            return paged;
        } catch (error) {
            console.error('Error Feed:', error);
        }
    },
};
