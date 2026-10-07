import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPost extends Document {
    discussionId?: mongoose.Types.ObjectId;
    eventId?: string; // a Postgres event id (uuid) since ticket 08
    authorId: mongoose.Types.ObjectId;

    content?: string;
    image?: string; // ImgBB URL

    likes: mongoose.Types.ObjectId[];
    pinned?: boolean;

    createdAt: Date;
    updatedAt: Date;
}

const PostSchema = new Schema<IPost>(
    {
        discussionId: { type: Schema.Types.ObjectId, ref: "Discussion", required: false, index: true },
        eventId: { type: String, required: false, index: true },
        authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },

        content: { type: String, required: false },

        image: { type: String },

        likes: [{ type: Schema.Types.ObjectId, ref: "User" }],
        pinned: { type: Boolean, default: false }
    },
    { timestamps: true }
);

PostSchema.index({ eventId: 1, createdAt: -1 });

export const PostModel: Model<IPost> = mongoose.model<IPost>("Post", PostSchema);
