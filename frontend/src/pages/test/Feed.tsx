import React, { useState, useEffect } from 'react';
import { getFeed, createPost, likePost } from '@/services/feed.service';
import { Heart, MessageCircle, Share2, Image as ImageIcon, ThumbsUp, Globe, MoreHorizontal, Smile, Video } from 'lucide-react';

const Feed = () => {
    const [feedData, setFeedData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [tab, setTab] = useState("all");
    const [commentContent, setCommentContent] = useState("");

    // State for creating post
    const [selectedImage, setSelectedImage] = useState<File | null>(null);

    // Fetch feed data
    useEffect(() => {
        // ... (function defined below)
        fetchFeed();
    }, [page, tab]);

    const fetchFeed = async () => {
        try {
            const data = await getFeed({ page, tab, limit: 10 });
            setFeedData(data.data);
        } catch (error) {
            console.error("Error fetching feed:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleTabChange = (newTab: string) => {
        setTab(newTab);
        setPage(1);
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setSelectedImage(e.target.files[0]);
        }
    };

    const handleCreatePost = async () => {
        if (!commentContent && !selectedImage) return;

        const formData = new FormData();
        formData.append('content', commentContent);
        if (selectedImage) {
            formData.append('image', selectedImage);
        }

        try {
            await createPost(formData);

            setCommentContent('');
            setSelectedImage(null);
            setLoading(true);
            await fetchFeed();
        } catch (error) {
            console.error("Error creating post:", error);
        }
    };

    const handleLike = async (postId: string) => {
        try {
            await likePost(postId);
            // Optimistic update or refresh? Refresh for now is safer, but optimistic is better.
            // Let's simple refresh for correctness first or just update local state if possible.
            // Given the complexity of nesting, I'll validly refetch for now or simple local update.
            // Local update: find item, toggle like (assuming I know current user ID? I don't have user ID in context easily here without more code).
            // Actually, I can just refetch.
            await fetchFeed();
        } catch (error) {
            console.error("Error liking post:", error);
        }
    };

    return (
        <div className="bg-gray-100 min-h-screen py-8">
            <div className="max-w-xl mx-auto space-y-6">

                {/* Tabs / Filter (Facebook style pills) */}
                <div className="bg-white rounded-lg shadow-sm p-2 flex space-x-2 overflow-x-auto">
                    {['all', 'joined', 'unjoined'].map((t) => (
                        <button
                            key={t}
                            onClick={() => handleTabChange(t)}
                            className={`px-4 py-2 rounded-full font-medium text-sm transition-colors whitespace-nowrap ${tab === t
                                ? 'bg-blue-100 text-blue-600'
                                : 'text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                    ))}

                </div>

                {/* Create Post Widget */}
                <div className="bg-white rounded-lg shadow-sm p-4">
                    <div className="flex space-x-3 mb-4">
                        {/* Placeholder Avatar */}
                        <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                            <img src="https://github.com/shadcn.png" alt="User" />
                        </div>
                        <div className="flex-1">
                            <input
                                type="text"
                                value={commentContent}
                                onChange={(e) => setCommentContent(e.target.value)}
                                placeholder="What's on your mind?"
                                className="w-full bg-gray-100 hover:bg-gray-200 rounded-full py-2 px-4 focus:outline-none focus:ring-1 focus:ring-gray-300 transition-colors cursor-pointer"
                            />
                        </div>
                    </div>

                    {selectedImage && (
                        <div className="mb-4 relative group">
                            <img
                                src={URL.createObjectURL(selectedImage)}
                                alt="Selected"
                                className="w-full h-60 object-cover rounded-lg"
                            />
                            <button
                                onClick={() => setSelectedImage(null)}
                                className="absolute top-2 right-2 bg-gray-800 bg-opacity-50 text-white rounded-full p-1 hover:bg-opacity-70"
                            >
                                x
                            </button>
                        </div>
                    )}

                    <div className="border-t pt-3 flex justify-between items-center px-2">
                        <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors flex-1 justify-center sm:justify-start">
                            <div className="text-green-500">
                                <ImageIcon size={24} />
                            </div>
                            <span className="font-medium text-gray-500 text-sm">Photo/Video</span>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="hidden"
                            />
                        </label>
                        <button className="flex items-center space-x-2 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors flex-1 justify-center sm:justify-start">
                            <div className="text-yellow-500">
                                <Smile size={24} />
                            </div>
                            <span className="font-medium text-gray-500 text-sm">Feeling/Activity</span>
                        </button>

                        {/* Only show POST button if content exists */}
                        {(commentContent || selectedImage) && (
                            <button
                                onClick={handleCreatePost}
                                className="bg-blue-600 text-white px-6 py-1.5 rounded-lg font-medium hover:bg-blue-700 transition"
                            >
                                Post
                            </button>
                        )}
                    </div>
                </div>

                {/* Feed List */}
                <div className="space-y-4">
                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="bg-white rounded-lg shadow-sm p-4 h-40 animate-pulse">
                                    <div className="flex space-x-4 mb-4">
                                        <div className="rounded-full bg-gray-200 h-10 w-10"></div>
                                        <div className="flex-1 space-y-2 py-1">
                                            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                                            <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        feedData.map((feedItem: any) => {
                            const post = feedItem.data;
                            const author = post.authorId;
                            // console.log("Post data:", post); // Debugging
                            return (
                                <div key={feedItem.data_id} className="bg-white rounded-lg shadow-sm pb-2">
                                    {/* Post Header */}
                                    <div className="px-4 pt-4 pb-2 flex items-start justify-between">
                                        <div className="flex space-x-3">
                                            <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden cursor-pointer">
                                                <img
                                                    src={author?.profilePicture || "https://github.com/shadcn.png"}
                                                    alt={author?.name || "User"}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-gray-900 hover:underline cursor-pointer">
                                                    {author?.name || author?.username || "Unknown User"}
                                                </div>
                                                <div className="text-xs text-gray-500 flex items-center space-x-1">
                                                    <span>{new Date(feedItem.createdAt).toLocaleDateString()}</span>
                                                    <span>•</span>
                                                    <Globe size={12} />
                                                </div>
                                            </div>
                                        </div>
                                        <button className="text-gray-500 hover:bg-gray-100 p-2 rounded-full">
                                            <MoreHorizontal size={20} />
                                        </button>
                                    </div>

                                    {/* Post Content */}
                                    {post.content && (
                                        <div className="px-4 py-2 text-gray-800 whitespace-pre-wrap">
                                            {post.content}
                                        </div>
                                    )}

                                    {/* Post Image */}
                                    {post.image && (
                                        <div className="mt-2">
                                            <img
                                                src={`${(import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '')}/file/${post.image.fileId}`}
                                                alt="Post content"
                                                className="w-full h-auto object-cover max-h-[600px] bg-gray-50"
                                            />
                                        </div>
                                    )}

                                    {/* Stats (Likes/Comments) */}
                                    <div className="px-4 py-3 flex justify-between text-gray-500 text-sm border-b border-gray-100 mx-4">
                                        <div className="flex items-center space-x-1 cursor-pointer hover:underline">
                                            <div className="bg-blue-500 rounded-full p-1 text-white">
                                                <ThumbsUp size={10} fill="white" />
                                            </div>
                                            <span>{post.likes?.length || 0}</span>
                                        </div>
                                        <div className="flex space-x-3">
                                            <span className="hover:underline cursor-pointer">0 comments</span>
                                            <span className="hover:underline cursor-pointer">0 shares</span>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="px-2 py-1 flex justify-between items-center mx-2">
                                        <button
                                            onClick={() => handleLike(post._id)}
                                            className="flex-1 flex items-center justify-center space-x-2 py-2 hover:bg-gray-100 rounded-lg text-gray-600 font-medium transition-colors"
                                        >
                                            <ThumbsUp size={20} />
                                            <span>Like</span>
                                        </button>
                                        <button className="flex-1 flex items-center justify-center space-x-2 py-2 hover:bg-gray-100 rounded-lg text-gray-600 font-medium transition-colors">
                                            <MessageCircle size={20} />
                                            <span>Comment</span>
                                        </button>
                                        <button className="flex-1 flex items-center justify-center space-x-2 py-2 hover:bg-gray-100 rounded-lg text-gray-600 font-medium transition-colors">
                                            <Share2 size={20} />
                                            <span>Share</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default Feed;
