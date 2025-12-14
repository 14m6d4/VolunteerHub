import { DiscussionModel } from "../models/Discussion.model.ts";

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
    }
};
