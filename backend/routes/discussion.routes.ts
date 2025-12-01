import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDiscussion extends Document {
    eventId: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
    locked?: boolean;
}

const DiscussionSchema = new Schema<IDiscussion>(
    {
        eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true, unique: true },
        locked: { type: Boolean, default: false }
    },
    { timestamps: true }
);

export const DiscussionModel: Model<IDiscussion> = mongoose.model<IDiscussion>(
    "Discussion",
    DiscussionSchema
);
