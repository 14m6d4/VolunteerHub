// backend/models/Report.model.ts
import mongoose, { Schema, Document, type ObjectId } from 'mongoose';

export enum ReportTargetType {
  User = 'user',
  Event = 'event',
  Post = 'post'
}

export interface IReport extends Document {
  reporter: ObjectId; // User who reports
  targetId: ObjectId; // ID of the user/event/post being reported
  targetType: ReportTargetType;
  reason: string;
  description?: string;
  status: 'pending' | 'resolved' | 'rejected';
  createdAt: Date;
}

const ReportSchema = new Schema<IReport>({
  reporter: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  targetId: { type: Schema.Types.ObjectId, required: true },
  targetType: { type: String, enum: Object.values(ReportTargetType), required: true },
  reason: { type: String, required: true },
  description: { type: String },
  status: { type: String, enum: ['pending', 'resolved', 'rejected'], default: 'pending' }
}, { timestamps: true });

export default mongoose.model<IReport>('Report', ReportSchema);