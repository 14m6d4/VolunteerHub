import { and, asc, count, desc, eq, gte, inArray, notInArray } from "drizzle-orm";
import { db } from "../db/client.ts";
import { comments, events, posts, registrations, users } from "../db/schema.ts";
import { EventStatus } from "../models/Event.model.ts";
import { RegistrationStatus } from "../models/Registration.model.ts";
import { toEvent } from "../utils/event.util.ts";
import { friendIdsOf } from "../utils/friend.util.ts";
import { commentLikerIds, postLikerIds, toComment, toPost } from "../utils/post.util.ts";
import { toLean } from "../utils/user.util.ts";

const JOINED = [RegistrationStatus.APPROVED, RegistrationStatus.COMPLETED];

function calculateScore(feed: any, data: any, user: any, friendCount = 0) {
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

    if (feed.type === "post") {
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
    return totalScore;
}

/** The newest posts of these events, one page, with author, event, likes, comment count and the latest comments. */
async function listFeedPosts(eventIds: string[], limit: number, skip: number) {
    if (!eventIds.length) return [];

    const rows = await db.select({
        post: posts,
        author: { id: users.id, username: users.username, name: users.name, profilePicture: users.profilePicture, role: users.role },
        event: { id: events.id, title: events.title, image: events.image },
    }).from(posts)
        .innerJoin(users, eq(users.id, posts.authorId))
        .innerJoin(events, eq(events.id, posts.eventId))
        .where(inArray(posts.eventId, eventIds))
        .orderBy(desc(posts.createdAt), asc(posts.id))
        .limit(limit).offset(skip);

    const postIds = rows.map((r) => r.post.id);
    if (!postIds.length) return [];

    const likes = await postLikerIds(postIds);
    const counts = new Map((await db.select({ postId: comments.postId, n: count() }).from(comments)
        .where(inArray(comments.postId, postIds)).groupBy(comments.postId)).map((c) => [c.postId, c.n]));

    // ponytail: the 40 newest comments across the whole page, as before; a post whose comments
    // are all older than that shows none. Per-post top 2 (window function) if that bites.
    const latest = await db.select({
        comment: comments,
        author: { id: users.id, name: users.name, username: users.username, profilePicture: users.profilePicture, role: users.role },
    }).from(comments)
        .innerJoin(users, eq(users.id, comments.authorId))
        .where(inArray(comments.postId, postIds))
        .orderBy(desc(comments.createdAt), asc(comments.id))
        .limit(40);
    const commentLikes = await commentLikerIds(latest.map((c) => c.comment.id));

    return rows.map(({ post, author, event }) => ({
        ...toPost(post, likes.get(post.id) ?? []),
        authorId: toLean(author),
        eventId: toLean(event),
        comments: latest.filter((c) => c.comment.postId === post.id).slice(0, 2)
            .map((c) => ({ ...toComment(c.comment, commentLikes.get(c.comment.id) ?? []), authorId: toLean(c.author) })),
        commentCount: counts.get(post.id) ?? 0,
    }));
}

export const FeedService = {
    async getFeed({ page = 1, limit = 40, tab = "all" }: { page?: number; limit?: number; tab?: string }, user?: any) {
        const skip = (page - 1) * limit;
        const userId: string | undefined = user?._id?.toString();

        let relevantEventIds: string[] = [];
        let userFriendsIds: string[] = [];
        let postRows: Awaited<ReturnType<typeof listFeedPosts>> = [];

        if (userId) {
            userFriendsIds = await friendIdsOf(userId);

            const joined = await db.select({ id: registrations.eventId }).from(registrations)
                .where(and(eq(registrations.volunteerId, userId), inArray(registrations.status, JOINED)));
            relevantEventIds = joined.map((r) => r.id);
            if (user.role === 'manager') {
                const managed = await db.select({ id: events.id }).from(events).where(eq(events.managerId, userId));
                relevantEventIds = [...new Set([...relevantEventIds, ...managed.map((e) => e.id)])];
            }

            postRows = await listFeedPosts(relevantEventIds, limit, skip);
        }

        const eventRows = await db.select().from(events).where(and(
            eq(events.status, EventStatus.APPROVED),
            relevantEventIds.length ? notInArray(events.id, relevantEventIds) : undefined,
        ));
        const eventList = eventRows.map(toEvent);

        const WINDOWS = [1, 2, 3];
        const nowTime = Date.now();

        const allEventIds = [...new Set([
            ...postRows.map((p) => p.eventId._id),
            ...eventList.map((e) => e._id),
        ])];

        // How many of the user's friends are in each event.
        const friendCountMap = new Map<string, number>();
        if (userFriendsIds.length && allEventIds.length) {
            const friendRegs = await db.select({ eventId: registrations.eventId, n: count() }).from(registrations)
                .where(and(
                    inArray(registrations.eventId, allEventIds),
                    inArray(registrations.volunteerId, userFriendsIds),
                    inArray(registrations.status, JOINED),
                )).groupBy(registrations.eventId);
            for (const r of friendRegs) friendCountMap.set(r.eventId, r.n);
        }

        const postItems = postRows.map((p) => {
            const friendCount = friendCountMap.get(p.eventId._id) || 0;
            return { type: "post", data: { ...p, friendCount }, createdAt: (p as Record<string, any>).createdAt, friendCount };
        });

        const eventIds = eventList.map((e) => e._id);
        const cutoff = new Date(nowTime - Math.max(...WINDOWS) * 24 * 3600000);

        const recentRegs = eventIds.length ? await db.select({ eventId: registrations.eventId, createdAt: registrations.createdAt })
            .from(registrations)
            .where(and(inArray(registrations.eventId, eventIds), inArray(registrations.status, JOINED), gte(registrations.createdAt, cutoff))) : [];

        const allEventPosts = eventIds.length ? await db.select({ id: posts.id, eventId: posts.eventId, createdAt: posts.createdAt })
            .from(posts).where(and(inArray(posts.eventId, eventIds), gte(posts.createdAt, cutoff))) : [];

        const recentComments = allEventPosts.length ? await db.select({ postId: comments.postId, createdAt: comments.createdAt })
            .from(comments).where(and(inArray(comments.postId, allEventPosts.map((p) => p.id)), gte(comments.createdAt, cutoff))) : [];

        const eventItems = eventList.map((e) => {
            const postsForEvent = allEventPosts.filter((p) => p.eventId === e._id);
            const postCount = postsForEvent.length;
            const friendCount = friendCountMap.get(e._id) || 0;
            const ePostIds = new Set(postsForEvent.map((p) => p.id));

            const features: any[] = [];
            for (const days of WINDOWS) {
                const windowCutoff = nowTime - days * 24 * 3600000;

                const members = recentRegs.filter((r) => r.eventId === e._id && r.createdAt.getTime() >= windowCutoff).length;
                if (members > 0) {
                    features.push({ type: 'rapid_growth', count: members, days, score: (members / days) * 4 });
                }

                const recentPosts = postsForEvent.filter((p) => p.createdAt.getTime() >= windowCutoff).length;
                if (recentPosts > 0) {
                    features.push({ type: 'active_community', count: recentPosts, days, score: (recentPosts / days) * 40 });
                }

                const recent = recentComments.filter((c) => ePostIds.has(c.postId) && c.createdAt.getTime() >= windowCutoff).length;
                if (recent > 0) {
                    features.push({ type: 'hot_discussion', count: recent, days, score: (recent / days) * 36 });
                }
            }

            let bestFeature = { type: 'trending_now', count: 0, days: 0, score: 0 };
            if (features.length > 0) {
                bestFeature = features.reduce((prev, current) => (prev.score > current.score) ? prev : current);
            }

            return { type: "trending", data: { ...e, postCount, friendCount, bestFeature }, createdAt: e.createdAt, friendCount };
        });

        return [...postItems, ...eventItems]
            .map((item) => ({ ...item, score: calculateScore(item, item.data, user, item.friendCount) }))
            .sort((a, b) => b.score - a.score);
    },
};
