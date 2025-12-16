import { Schema, model, Types } from "mongoose";
export enum NotificationType {
    EVENT_JOINED = "event_joined",
    EVENT_UPDATED = "event_updated",
    EVENT_CANCELLED = "event_cancelled",
    EVENT_KICKED = "event_kicked",
    EVENT_APPROVED = "event_approved",
    EVENT_PENDING = "event_pending",
    REGISTRATION_PENDING = "registration_pending",
    EVENT_REMINDER = "event_reminder"
}

const NotificationSchema = new Schema(
    {
        userId: { type: Types.ObjectId, ref: "User", required: true },
        type: { type: String, enum: Object.values(NotificationType) },
        title: String,
        body: String,
        data: Object,
        read: { type: Boolean, default: false }
    },
    { timestamps: true }
);

NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

export const NotificationModel = model(
    "Notification",
    NotificationSchema
);