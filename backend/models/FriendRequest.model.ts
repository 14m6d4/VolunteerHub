import mongoose, { Schema, Document, type ObjectId } from 'mongoose';

export enum FriendRequestStatus {
  Pending = 'pending',
  Accepted = 'accepted',
  Declined = 'declined'
}

export interface IFriendRequest extends Document {
  sender: ObjectId;
  receiver: ObjectId;
  status: FriendRequestStatus;
  createdAt: Date;
}

const FriendRequestSchema = new Schema<IFriendRequest>({
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: {
    type: String,
    enum: Object.values(FriendRequestStatus),
    default: FriendRequestStatus.Pending
  }
}, { timestamps: true });

FriendRequestSchema.index({ sender: 1, receiver: 1 }, { unique: true });

export default mongoose.model<IFriendRequest>('FriendRequest', FriendRequestSchema);