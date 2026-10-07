import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDiscussion extends Document {
    eventId: string; // a Postgres event id (uuid) since ticket 08
    createdAt: Date;
    updatedAt: Date;
    locked?: boolean;
}

const DiscussionSchema = new Schema<IDiscussion>(
    {
        eventId: { type: String, required: true, unique: true },
        locked: { type: Boolean, default: false }
    },
    { timestamps: true }
);

export const DiscussionModel: Model<IDiscussion> = mongoose.model<IDiscussion>(
    "Discussion",
    DiscussionSchema
);
