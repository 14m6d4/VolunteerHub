import mongoose, { Schema, Document, Model } from "mongoose";

export enum RegistrationStatus {
    PENDING = "pending",
    APPROVED = "approved",
    REJECTED = "rejected",
    CANCELLED = "cancelled",
    COMPLETED = "completed"
}

export interface IRegistration extends Document {
    eventId: mongoose.Types.ObjectId;
    volunteerId: mongoose.Types.ObjectId;
    status: RegistrationStatus;
    createdAt: Date;
    updatedAt: Date;
    note?: string;
    completedAt?: Date | null;
}

const RegistrationSchema = new Schema<IRegistration>(
    {
        eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true, index: true },
        volunteerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        status: {
            type: String,
            enum: Object.values(RegistrationStatus),
            default: RegistrationStatus.PENDING
        },
        note: { type: String, default: "" },
        completedAt: { type: Date, default: null }
    },
    { timestamps: true }
);

RegistrationSchema.index({ eventId: 1, volunteerId: 1 }, { unique: true });

export const RegistrationModel: Model<IRegistration> = mongoose.model<IRegistration>(
    "Registration",
    RegistrationSchema
);
