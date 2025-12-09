import mongoose, { Schema, Document, Model } from "mongoose";

export interface IComment extends Document {
    postId: mongoose.Types.ObjectId;
    authorId: mongoose.Types.ObjectId;
    content: string;
    likes: mongoose.Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}

const CommentSchema = new Schema<IComment>(
    {
        postId: { type: Schema.Types.ObjectId, ref: "Post", required: true, index: true },
        authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        content: { type: String, required: true },
        likes: [{ type: Schema.Types.ObjectId, ref: "User" }]
    },
    { timestamps: true }
);

export const CommentModel: Model<IComment> =
    mongoose.model<IComment>("Comment", CommentSchema);
