import mongoose, { Schema, Document, type Model, Types } from 'mongoose';

export enum ReportTargetType {
  User = 'user',
  Event = 'event',
  Post = 'post'
}

export interface IReport extends Document {
  reporter: Types.ObjectId; // User who reports
  targetId: string; // ID of the user/event/post being reported (a uuid since users, events and posts moved to PostgreSQL)
  targetType: ReportTargetType;
  reason: string;
  description?: string;
  status: 'pending' | 'resolved' | 'rejected';
  createdAt: Date;
}

const ReportSchema = new Schema<IReport>({
  reporter: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  targetId: { type: String, required: true },
  targetType: { type: String, enum: Object.values(ReportTargetType), required: true },
  reason: { type: String, required: true },
  description: { type: String },
  status: { type: String, enum: ['pending', 'resolved', 'rejected'], default: 'pending' }
}, { timestamps: true });

export const ReportModel: Model<IReport> = mongoose.model<IReport>('Report', ReportSchema);