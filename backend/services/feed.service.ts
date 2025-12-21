// backend/services/feed.service.ts
import { PostModel } from "../models/Post.model.ts";
import { FeedType } from "../models/Feed.model.ts";
import { RegistrationModel } from "../models/Registration.model.ts";
import { EventModel } from "../models/Event.model.ts";
import UserModel from "../models/User.model.ts";

function calculateScore(feed, data, user, friendCount = 0) {
    const now = Date.now();
    const ageHours = (now - new Date(feed.createdAt).getTime()) / 3600000;

    let recencyScore = 0;
    if (ageHours < 6) {
        recencyScore = 30;
    } else if (ageHours < 24) {
        recencyScore = 20 + (10 * (1 - (ageHours - 6) / 18));
    } else if (ageHours < 72) {
        recencyScore = 10 + (10 * (1 - (ageHours - 24) / 48));
    } else {
        recencyScore = Math.max(0, 10 - Math.log(ageHours - 72 + 1));
    }

    let engagementScore = 0;
    let typeBonus = 0;
    let velocityScore = 0;

    if (feed.type === FeedType.POST) {
        const likesScore = Math.min(25, (data.likes?.length || 0) * 2.5);
        const commentsScore = Math.min(25, (data.commentCount || 0) * 3);
        engagementScore = likesScore + commentsScore;

        typeBonus = 20;
    } else if (feed.type === 'trending') {
        const membersScore = Math.min(25, (data.currentMembers || 0) * 0.5);
        const activityScore = Math.min(25, (data.postCount || 0) * 2);
        engagementScore = membersScore + activityScore;
        typeBonus = 10;

        // Velocity Boost for trending events
        // Use the velocity score from the best feature found during analysis
        velocityScore = Math.min(60, data.bestFeature?.score || 0);
    }

    // Social score based on friend count in the event
    // Each friend in the event adds significant  value (up to 30 points for 6+ friends)
    const socialScore = Math.min(30, friendCount * 5);

    const totalScore = recencyScore + engagementScore + typeBonus + socialScore + velocityScore;
    console.log(`Feed Item: ${feed.type}, Total Score: ${totalScore}, Velocity: ${velocityScore}`);
    return totalScore;
}

export const FeedService = {
    async getFeed({ page = 1, limit = 20, tab = "all" }, user?) {
        try {
            const skip = (page - 1) * limit;
            let postQuery: any = {};
            let eventQuery: any = { status: "approved" };
            let joinedEventIds: any[] = [];
            let userFriendsIds: any[] = [];

            if (user) {
                // Fetch user's friends
                const userData = await UserModel.findById(user._id).select('friends').lean();
                userFriendsIds = userData?.friends || [];

                const joinedRegs = await RegistrationModel.find({
                    volunteerId: user._id,
                    status: { $in: ["approved", "completed"] },
                }).select("eventId");
                joinedEventIds = joinedRegs.map(r => r.eventId);

                postQuery = { eventId: { $in: joinedEventIds } };

                eventQuery._id = { $nin: joinedEventIds };
            } else {
                postQuery = { isPublic: true };
                eventQuery.isPublic = true;
            }

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

            const WINDOWS = [1, 2, 3, 5];
            const nowTime = Date.now();

            // Helper function to count friends in an event
            const countFriendsInEvent = async (eventId: any) => {
                if (userFriendsIds.length === 0) return 0;
                const count = await RegistrationModel.countDocuments({
                    eventId,
                    volunteerId: { $in: userFriendsIds },
                    status: { $in: ["approved", "completed"] }
                });
                return count;
            };

            const postsWithComments = await Promise.all(posts.map(async (p: any) => {
                const comments = await (await import("../models/Comment.model.ts")).CommentModel.find({ postId: p._id })
                    .sort({ createdAt: -1 })
                    .limit(2)
                    .populate("authorId", "name username profilePicture");

                const commentCount = await (await import("../models/Comment.model.ts")).CommentModel.countDocuments({ postId: p._id });
                const friendCount = await countFriendsInEvent(p.eventId._id || p.eventId);

                return { ...p, comments, commentCount, friendCount };
            }));

            const postItems = postsWithComments.map(p => ({
                type: "post",
                data: p,
                createdAt: p.createdAt,
                friendCount: p.friendCount
            }));

            const eventsWithVelocity = await Promise.all(events.map(async (e: any) => {
                // Total counts
                const postCount = await PostModel.countDocuments({ eventId: e._id });
                const friendCount = await countFriendsInEvent(e._id);

                const eventPosts = await PostModel.find({ eventId: e._id }).select('_id createdAt').lean();
                const eventPostIds = eventPosts.map(p => p._id);

                // Analyze multiple windows
                const features: any[] = [];

                for (const days of WINDOWS) {
                    const cutoff = new Date(nowTime - days * 24 * 3600000);

                    // Members growth
                    const members = await RegistrationModel.countDocuments({
                        eventId: e._id,
                        status: { $in: ["approved", "completed"] },
                        createdAt: { $gte: cutoff }
                    });
                    if (members > 0) {
                        features.push({
                            type: 'rapid_growth',
                            count: members,
                            days,
                            score: (members / days) * 12 // Points per member per day
                        });
                    }

                    // Posts growth
                    const recentPosts = eventPosts.filter(p => (p as any).createdAt >= cutoff).length;
                    if (recentPosts > 0) {
                        features.push({
                            type: 'active_community',
                            count: recentPosts,
                            days,
                            score: (recentPosts / days) * 18 // Points per post per day
                        });
                    }
                }

                // Pick the best feature (highest score)
                let bestFeature = { type: 'trending_now', count: 0, days: 0, score: 0 };
                if (features.length > 0) {
                    bestFeature = features.reduce((prev, current) => (prev.score > current.score) ? prev : current);
                }

                return {
                    ...e,
                    postCount,
                    friendCount,
                    bestFeature
                };
            }));

            const eventItems = eventsWithVelocity.map(e => ({
                type: "trending",
                data: e,
                createdAt: e.createdAt,
                friendCount: e.friendCount
            }));

            let combinedFeed = [...postItems, ...eventItems]
                .map(item => ({
                    ...item,
                    score: calculateScore(item, item.data, user, item.friendCount),
                }))
                .sort((a, b) => b.score - a.score);

            return combinedFeed;
        } catch (error) {
            console.error('Error Feed:', error);
            throw error;
        }
    },
};
