// backend/services/feed.service.ts
import { PostModel } from "../models/Post.model.ts";
import { FeedType } from "../models/Feed.model.ts";
import { RegistrationModel } from "../models/Registration.model.ts";
import { EventModel } from "../models/Event.model.ts";
import UserModel from "../models/User.model.ts";
import { CommentModel } from "../models/Comment.model.ts";

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

        velocityScore = Math.min(60, data.bestFeature?.score || 0);
    }

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

            let posts: any[] = [];
            let events: any[] = [];

            if (user) {
                const userData = await UserModel.findById(user._id).select('friends').lean();
                userFriendsIds = userData?.friends || [];

                const joinedRegs = await RegistrationModel.find({
                    volunteerId: user._id,
                    status: { $in: ["approved", "completed"] },
                }).select("eventId");
                joinedEventIds = joinedRegs.map(r => r.eventId);

                postQuery = { eventId: { $in: joinedEventIds } };
                eventQuery._id = { $nin: joinedEventIds };

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

                [posts, events] = await Promise.all([postsPromise, eventsPromise]);
            } else {
                events = await EventModel.find(eventQuery)
                    .sort({ currentMembers: -1, createdAt: -1 })
                    .limit(5)
                    .lean();
            }

            const WINDOWS = [1, 2];
            const nowTime = Date.now();

            const allEventIds = [
                ...new Set([
                    ...posts.map(p => p.eventId?._id || p.eventId),
                    ...events.map(e => e._id)
                ])
            ].filter(id => id);

            let friendCountMap = new Map();
            if (user && userFriendsIds.length > 0) {
                const friendRegs = await RegistrationModel.aggregate([
                    {
                        $match: {
                            eventId: { $in: allEventIds },
                            volunteerId: { $in: userFriendsIds },
                            status: { $in: ["approved", "completed"] }
                        }
                    },
                    { $group: { _id: "$eventId", count: { $sum: 1 } } }
                ]);
                friendCountMap = new Map(friendRegs.map(r => [r._id.toString(), r.count]));
            }

            const postIds = posts.map(p => p._id);
            const commentCounts = await CommentModel.aggregate([
                { $match: { postId: { $in: postIds } } },
                { $group: { _id: "$postId", count: { $sum: 1 } } }
            ]);
            const commentCountMap = new Map(commentCounts.map(c => [c._id.toString(), c.count]));

            const latestComments = await CommentModel.find({ postId: { $in: postIds } })
                .sort({ createdAt: -1 })
                .populate("authorId", "name username profilePicture")
                .limit(40)
                .lean();

            const postsWithComments = posts.map((p: any) => {
                const pId = p._id.toString();
                const eventId = (p.eventId?._id || p.eventId)?.toString() || "";

                const comments = latestComments
                    .filter(c => c.postId.toString() === pId)
                    .slice(0, 2);

                return {
                    ...p,
                    comments,
                    commentCount: commentCountMap.get(pId) || 0,
                    friendCount: friendCountMap.get(eventId) || 0
                };
            });

            const postItems = postsWithComments.map(p => ({
                type: "post",
                data: p,
                createdAt: p.createdAt,
                friendCount: p.friendCount
            }));

            const eventIds = events.map(e => e._id);
            const maxWindow = Math.max(...WINDOWS);
            const cutoff = new Date(nowTime - maxWindow * 24 * 3600000);

            const recentRegs = await RegistrationModel.find({
                eventId: { $in: eventIds },
                status: { $in: ["approved", "completed"] },
                createdAt: { $gte: cutoff }
            }).select('eventId createdAt').lean();


            const allEventPosts = await PostModel.find({
                eventId: { $in: eventIds }
            }).select('eventId createdAt').lean();

            const eventPostIds = allEventPosts.map(p => p._id);
            const recentCommentsAgg = await CommentModel.find({
                postId: { $in: eventPostIds },
                createdAt: { $gte: cutoff }
            }).select('postId createdAt').lean();

            const eventsWithVelocity = events.map((e: any) => {
                const eIdStr = e._id.toString();
                const postsForEvent = allEventPosts.filter(p => p.eventId?.toString() === eIdStr);
                const postCount = postsForEvent.length;
                const friendCount = friendCountMap.get(eIdStr) || 0;

                const features: any[] = [];
                for (const days of WINDOWS) {
                    const windowCutoff = new Date(nowTime - days * 24 * 3600000);

                    const members = recentRegs.filter(r =>
                        r.eventId.toString() === eIdStr && r.createdAt >= windowCutoff
                    ).length;
                    if (members > 0) {
                        features.push({ type: 'rapid_growth', count: members, days, score: (members / days) * 12 });
                    }

                    const recentPosts = postsForEvent.filter(p => p.createdAt >= windowCutoff).length;
                    if (recentPosts > 0) {
                        features.push({ type: 'active_community', count: recentPosts, days, score: (recentPosts / days) * 18 });
                    }

                    const ePostIds = new Set(postsForEvent.map(p => p._id.toString()));
                    const comments = recentCommentsAgg.filter(c =>
                        ePostIds.has(c.postId.toString()) && c.createdAt >= windowCutoff
                    ).length;
                    if (comments > 0) {
                        features.push({ type: 'hot_discussion', count: comments, days, score: (comments / days) * 6 });
                    }
                }

                let bestFeature = { type: 'trending_now', count: 0, days: 0, score: 0 };
                if (features.length > 0) {
                    bestFeature = features.reduce((prev, current) => (prev.score > current.score) ? prev : current);
                }

                return { ...e, postCount, friendCount, bestFeature };
            });

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
