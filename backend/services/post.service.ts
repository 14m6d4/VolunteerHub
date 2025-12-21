import { PostModel } from "../models/Post.model.ts";
import { uploadToImgBB } from "./imgbb.service.ts";
import { NotificationService } from "./notification.service.ts";
import { NotificationType } from "../models/Notification.model.ts";
import User from "../models/User.model.ts";

export const PostService = {
    async createPost({ userId, discussionId, eventId, content, file }: { userId: string, discussionId?: string, eventId?: string, content?: string, file?: Express.Multer.File }) {
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
                eventId,
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
            .populate('authorId', 'name username profilePicture') // Populate author details
            .populate({
                path: 'likes',
                select: 'name username'
            })
            .sort({ pinned: -1, createdAt: -1 })
            .lean();
        return posts;
    },

    async getPostsByEvent(eventId: string) {
        const posts = await PostModel.find({ eventId })
            .populate('authorId', 'name username profilePicture email role') // Populate author details
            .populate({
                path: 'likes',
                select: 'name username'
            })
            .sort({ pinned: -1, createdAt: -1 })
            .lean();
        return posts;
    },

    async likePost(userId: string, postId: string) {
        const post = await PostModel.findById(postId).populate('authorId', 'name');
        if (!post) throw new Error("Post not found");

        const isLiked = post.likes.includes(userId as any);
        const update = isLiked
            ? { $pull: { likes: userId } }
            : { $addToSet: { likes: userId } };

        const updatedPost = await PostModel.findByIdAndUpdate(postId, update, { new: true });

        // Send notification if it's a new like and not liking own post
        if (!isLiked && post.authorId._id.toString() !== userId) {
            try {
                const liker = await User.findById(userId).select('name username');
                if (liker) {
                    await NotificationService.notify(post.authorId._id.toString(), {
                        type: NotificationType.POST_LIKED,
                        title: "Post Liked",
                        body: `${liker.name} liked your post`,
                        data: { postId, userId, likerName: liker.name }
                    });
                }
            } catch (err) {
                console.error("Failed to send like notification:", err);
            }
        }

        return updatedPost;
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
    },


    async getPostById(postId: string) {
        console.log("Fetching post by ID:", postId);
        const post = await PostModel.findById(postId)
            .populate('authorId', 'name username profilePicture')
            .populate({
                path: 'likes',
                select: 'name username'
            })
            .lean();
        if (!post) throw new Error("Post not found");
        return post;
    }
};
