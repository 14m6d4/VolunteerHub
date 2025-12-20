import { PostModel } from "../models/Post.model.ts";
import { uploadToImgBB } from "./imgbb.service.ts";

export const PostService = {
    async createPost({ userId, discussionId, content, file }: { userId: string, discussionId?: string, content?: string, file?: Express.Multer.File }) {
        try {
            let image = undefined;

            if (file) {
                // file is in memory buffer
                console.log(`Uploading file ${file.originalname} to ImgBB...`);
                image = await uploadToImgBB(file.buffer, file.originalname);
            }

            if (!content && !image) {
                throw new Error("Post must contain either text or image.");
            }

            const post = PostModel.create({
                discussionId,
                authorId: userId,
                content,
                image
            } as any);
            return post
        } catch (error) {
            console.error("Create post error", error)
            throw (error)
        }
    },

    async getPostsByDiscussion(discussionId: string) {
        const posts = await PostModel.find({ discussionId })
            .sort({ pinned: -1, createdAt: -1 })
            .lean();

        // Image is now a URL string, so we don't need to transform it
        return posts;
    },

    async likePost(userId: string, postId: string) {
        const post = await PostModel.findById(postId);
        if (!post) throw new Error("Post not found");

        const isLiked = post.likes.includes(userId as any);
        const update = isLiked
            ? { $pull: { likes: userId } }
            : { $addToSet: { likes: userId } };

        return PostModel.findByIdAndUpdate(postId, update, { new: true });
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
