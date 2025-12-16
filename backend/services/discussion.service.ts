import { DiscussionModel } from "../models/Discussion.model.ts";
import { PostModel } from "../models/Post.model.ts";

export const DiscussionService = {
    async createDiscussion(eventId: string) {
        return DiscussionModel.create({ eventId });
    },

    async getByEventId(eventId: string) {
        return DiscussionModel.findOne({ eventId });
    },

    async getById(discussionId: string) {
        return DiscussionModel.findById(discussionId);
    },

    async lockDiscussion(discussionId: string) {
        return DiscussionModel.findByIdAndUpdate(
            discussionId,
            { locked: true },
            { new: true }
        );
    },

    async unlockDiscussion(discussionId: string) {
        return DiscussionModel.findByIdAndUpdate(
            discussionId,
            { locked: false },
            { new: true }
        );
    },

    async getDiscussionPosts(discussionId: string) {
        const posts = await PostModel.find({ discussionId })
            .sort({ pinned: -1, createdAt: -1 })
            .lean();

        return posts.map(post => ({
            ...post,
            attachments: post.attachments?.map(att => ({
                ...att,
                url: `${process.env.SERVER_URL}/file/${att.fileId}`
            })) || []
        }));
    },
};
