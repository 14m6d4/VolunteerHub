import { PostModel } from "../models/Post.model.ts";
import { getGFS } from "../utils/gridfs.ts";

export const PostService = {
    async createPost({ userId, discussionId, content, file }: { userId: string, discussionId?: string, content?: string, file?: Express.Multer.File }) {
        try {
            const gfs = getGFS();
            let image = undefined;

            if (file) {
                const uploadStream = gfs.openUploadStream(file.originalname, {
                    contentType: file.mimetype
                });

                uploadStream.end(file.buffer);

                await new Promise((resolve, reject) => {
                    uploadStream.on("finish", resolve);
                    uploadStream.on("error", reject);
                });

                image = {
                    fileId: uploadStream.id,
                    type: file.mimetype
                };
            }

            if (!content && !image) {
                throw new Error("Post must contain either text or image.");
            }
            console.log("last")
            const post = PostModel.create({
                discussionId,
                authorId: userId,
                content,
                image
            });
            console.log("create")
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

        return posts.map(post => ({
            ...post,
            image: post.image ? {
                ...post.image,
                url: `${process.env.SERVER_URL}/file/${post.image.fileId}`
            } : undefined
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
