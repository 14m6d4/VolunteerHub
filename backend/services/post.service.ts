import { PostModel } from "../models/Post.model.ts";
import { getGFS } from "../utils/gridfs.ts";

export const PostService = {
    async createPost({ userId, discussionId, content, files }) {
        const gfs = getGFS();
        const attachments = [];

        if (files?.length) {
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
        }

        if (!content && attachments.length === 0) {
            throw new Error("Post must contain either text or image.");
        }

        return PostModel.create({
            discussionId,
            authorId: userId,
            content,
            attachments
        });
    },

    async getPostsByDiscussion(discussionId: string) {
        const posts = await PostModel.find({ discussionId })
            .sort({ pinned: -1, createdAt: -1 })
            .lean();

        return posts.map(post => ({
            ...post,
            attachments: post.attachments?.map(att => ({
                ...att,
                url: `${process.env.SERVER_URL}/file/${att.fileId}`
            })) || []
        }));
    },

    async likePost(userId: string, postId: string) {
        return PostModel.findByIdAndUpdate(
            postId,
            { $addToSet: { likes: userId } },
            { new: true }
        );
    },

    async deletePost(postId: string) {
        return PostModel.findByIdAndDelete(postId);
    },

    async togglePin(postId: string) {
        const post = await PostModel.findById(postId);
        if (!post) throw new Error("Post not found");

        post.pinned = !post.pinned;
        await post.save();
        return post;
    }
};
