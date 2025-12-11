import mongoose from "mongoose";
import { PostModel } from "../models/Post.model.ts";
import { getGFS } from "../utils/gridfs.ts";

export const DiscussionService = {
    async createPost({ userId, discussionId, content, files }) {
        const gfs = getGFS();

        const attachments = [];

        // Upload từng ảnh vào GridFS
        for (const file of files) {
            const uploadStream = gfs.openUploadStream(file.originalname, {
                contentType: file.mimetype
            });

            uploadStream.end(file.buffer);

            const savedFile: any = await new Promise((resolve, reject) => {
                uploadStream.on("finish", resolve);
                uploadStream.on("error", reject);
            });

            attachments.push({
                fileId: savedFile._id,
                type: savedFile.contentType
            });
        }

        // Nếu không có text và không có ảnh → lỗi
        if (!content && attachments.length === 0) {
            throw new Error("Post must contain either text or image.");
        }

        const post = await PostModel.create({
            discussionId,
            authorId: userId,
            content,
            attachments
        });

        return post;
    },

    async getPosts(discussionId) {
        const posts = await PostModel.find({ discussionId })
            .sort({ pinned: -1, createdAt: -1 })
            .lean(); // dùng lean để dễ chỉnh sửa object

        return posts.map(post => {
            post.attachments = post.attachments?.map(att => ({
                ...att,
                url: `${process.env.SERVER_URL}/file/${att.fileId}`
            })) || [];
            return post;
        });
    },

    async likePost(userId, postId) {
        return PostModel.findByIdAndUpdate(
            postId,
            { $addToSet: { likes: userId } },
            { new: true }
        );
    },

    async deletePost(postId) {
        return PostModel.findByIdAndDelete(postId);
    },

    async pinPost(postId) {
        const post = await PostModel.findById(postId);
        post.pinned = !post.pinned;
        await post.save();
        return post;
    }
};
