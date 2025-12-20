import mongoose, { Schema, Document } from 'mongoose';


export enum NotificationType {
  EVENT_JOINED = "event_joined",
  EVENT_UPDATED = "event_updated",
  EVENT_CANCELLED = "event_cancelled",
  EVENT_KICKED = "event_kicked",
  EVENT_APPROVED = "event_approved",
  EVENT_PENDING = "event_pending",
  REGISTRATION_PENDING = "registration_pending",
  EVENT_REMINDER = "event_reminder",
  FRIEND_REQUEST_RECEIVED = 'friend_request_received',
  FRIEND_REQUEST_ACCEPTED = 'friend_request_accepted',
  EVENT_REPORTED = 'event_report',
  USER_REPORTED = 'user_report',
  POST_REPORTED = 'post_report',
  REPORT_RESOLVED = 'report_resolved',
  REPORT_REJECTED = 'report_rejected'
}

export interface INotification extends Document {
  user: mongoose.Types.ObjectId; // recipient
  actor?: mongoose.Types.ObjectId; // who triggered it
  type: NotificationType;
  title: string;
  body?: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}


const NotificationSchema = new Schema<INotification>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    actor: { type: Schema.Types.ObjectId, ref: 'User' },
    type: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String },
    data: { type: Schema.Types.Mixed },
    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

export default mongoose.model<INotification>('Notification', NotificationSchema);
