import { Schema, model, Types } from "mongoose";

const PushSubscriptionSchema = new Schema(
    {
        userId: { type: Types.ObjectId, ref: "User", required: true },
        endpoint: { type: String, required: true },
        keys: {
            p256dh: String,
            auth: String
        },
        userAgent: String
    },
    { timestamps: true }
);

PushSubscriptionSchema.index({ userId: 1 });

export const PushSubscriptionModel = model(
    "PushSubscription",
    PushSubscriptionSchema
);
