import mongoose, { Schema, Document, Model } from "mongoose";

export enum EventStatus {
    DRAFT = "draft",
    PENDING = "pending",
    APPROVED = "approved",
    CANCELLED = "cancelled",
    FINISHED = "finished"
}

export interface IEvent extends Document {
    title: string;
    description?: string;
    location?: string;
    startAt: Date;
    endAt?: Date;
    tags: string[];
    maxMembers?: number;
    currentMembers: number;
    status: EventStatus;
    isPublic: boolean;
    managerId: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
    pinnedPostId?: mongoose.Types.ObjectId | null;
}

const EventSchema = new Schema<IEvent>(
    {
        title: { type: String, required: true, trim: true },
        description: { type: String, default: "" },
        location: { type: String, default: "" },
        startAt: { type: Date, required: true },
        endAt: { type: Date },
        tags: { type: [String], default: [] },
        maxMembers: { type: Number, default: null },
        currentMembers: { type: Number, default: 0 },
        status: {
            type: String,
            enum: Object.values(EventStatus),
            default: EventStatus.PENDING
        },
        isPublic: { type: Boolean, default: true },
        managerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        pinnedPostId: { type: Schema.Types.ObjectId, ref: "Post", default: null }
    },
    { timestamps: true }
);

// Virtual: isFull
EventSchema.virtual("isFull").get(function (this: IEvent) {
    if (!this.maxMembers) return false;
    return this.currentMembers >= this.maxMembers;
});

// Indexes for search/filter
EventSchema.index({ title: "text", description: "text", tags: 1 });
EventSchema.index({ startAt: 1, status: 1 });

export const EventModel: Model<IEvent> = mongoose.model<IEvent>("Event", EventSchema);
