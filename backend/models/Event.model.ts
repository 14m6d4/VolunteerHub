import mongoose, { Schema, Document, Model } from "mongoose";

export enum EventStatus {
    DRAFT = "draft",
    PENDING = "pending",
    APPROVED = "approved",
    CANCELLED = "cancelled",
    FINISHED = "finished"
}

export const EventTags = [
    "Education",
    "Environment",
    "Health",
    "Community",
    "Technology",
    "Arts & Culture",
    "Sports",
    "Crisis Relief",
    "Animal Welfare",
    "Senior Care",
    "Child Care",
    "Food Security",
    "Housing",
    "Human Rights",
    "Mentorship"
];

export interface IEvent extends Document {
    title: string;
    description?: string;
    location?: string;
    startAt: Date;
    endAt?: Date;
    maxMembers?: number;
    currentMembers: number;
    status: EventStatus;
    isPublic: boolean;
    managerId: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
    pinnedPostId?: mongoose.Types.ObjectId | null;
    tags?: string[];
    image?: string;
}

const EventSchema = new Schema<IEvent>(
    {
        title: { type: String, required: true, trim: true },
        description: { type: String, default: "" },
        location: { type: String, default: "" },
        startAt: { type: Date, required: true },
        endAt: { type: Date },
        maxMembers: { type: Number, default: null },
        currentMembers: { type: Number, default: 0 },
        status: {
            type: String,
            enum: Object.values(EventStatus),
            default: EventStatus.PENDING
        },
        isPublic: { type: Boolean, default: true },
        managerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        pinnedPostId: { type: Schema.Types.ObjectId, ref: "Post", default: null },
        tags: { type: [String], default: [] },
        image: { type: String, default: "" }
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

EventSchema.virtual("isFull").get(function (this: IEvent) {
    if (!this.maxMembers) return false;
    return this.currentMembers >= this.maxMembers;
});

EventSchema.index({ title: "text", description: "text" });
EventSchema.index({ startAt: 1, status: 1 });

export const EventModel: Model<IEvent> = mongoose.model<IEvent>("Event", EventSchema);
