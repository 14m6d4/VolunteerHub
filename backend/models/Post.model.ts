import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPost extends Document {
    discussionId: mongoose.Types.ObjectId;
    eventId?: mongoose.Types.ObjectId;
    authorId: mongoose.Types.ObjectId;

    content?: string;
    attachments?: { fileId: mongoose.Types.ObjectId; type?: string }[];

    likes: mongoose.Types.ObjectId[];
    pinned?: boolean;

    createdAt: Date;
    updatedAt: Date;
}

const PostSchema = new Schema<IPost>(
    {
        discussionId: { type: Schema.Types.ObjectId, ref: "Discussion", required: true, index: true },
        eventId: { type: Schema.Types.ObjectId, ref: "Event", required: false, index: true },
        authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },

        content: { type: String, required: false },

        attachments: [
            {
                fileId: { type: Schema.Types.ObjectId },
                type: { type: String }
            }
        ],

        likes: [{ type: Schema.Types.ObjectId, ref: "User" }],
        pinned: { type: Boolean, default: false }
    },
    { timestamps: true }
);

PostSchema.index({ eventId: 1, createdAt: -1 });

export const PostModel: Model<IPost> = mongoose.model<IPost>("Post", PostSchema);
