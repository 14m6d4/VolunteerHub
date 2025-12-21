// models/Feed.model.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export enum FeedType {
    EVENT = "event",
    POST = "post"
}

export interface IFeed extends Document {
    type: FeedType;
    refId: mongoose.Types.ObjectId;
    eventId?: mongoose.Types.ObjectId;
    createdAt: Date;
}

const FeedSchema = new Schema<IFeed>(
    {
        type: {
            type: String,
            enum: Object.values(FeedType),
            required: true
        },
        refId: {
            type: Schema.Types.ObjectId,
            required: true
        },
        eventId: {
            type: Schema.Types.ObjectId,
            ref: "Event"
        }
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

FeedSchema.index({ createdAt: -1 });
FeedSchema.index({ eventId: 1, createdAt: -1 });

export const FeedModel: Model<IFeed> =
    mongoose.model<IFeed>("Feed", FeedSchema);
