// frontend/src/pages/Feed.tsx

import { useState, useMemo, useCallback } from 'react';
import { FeedPostCard, TrendingEventCard, EventShortcuts, FriendSuggestions } from '@/components/feed';
import {
  joinedEvents,
  trendingEvents,
  feedPosts,
  friendSuggestions,
  getFeedUserById,
  currentFeedUser,
  type FeedPostWithUser,
} from '@/data/feed-mock';
import type { Comment, CommentWithUser } from '@/types/discussion';

// Feed item type for mixed content
type FeedItem =
  | { type: 'post'; data: FeedPostWithUser }
  | { type: 'trending'; data: (typeof trendingEvents)[0] };

export default function FeedPage() {
  const [posts, setPosts] = useState(feedPosts);

  // Enrich posts with user data
  const postsWithUsers: FeedPostWithUser[] = useMemo(() => {
    return posts
      .map((post) => {
        const author = getFeedUserById(post.userId);
        if (!author) return null;
        return { ...post, author };
      })
      .filter((post): post is FeedPostWithUser => post !== null)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [posts]);

  // Create mixed feed with trending events interspersed
  const mixedFeed = useMemo((): FeedItem[] => {
    const items: FeedItem[] = [];
    const trendingCopy = [...trendingEvents];
    let trendingIndex = 0;

    postsWithUsers.forEach((post, index) => {
      items.push({ type: 'post', data: post });

      // Insert a trending event after every 3 posts
      if ((index + 1) % 3 === 0 && trendingIndex < trendingCopy.length) {
        items.push({ type: 'trending', data: trendingCopy[trendingIndex] });
        trendingIndex++;
      }
    });

    return items;
  }, [postsWithUsers]);

  // Get comments with user data for a post
  const getCommentsForPost = useCallback(
    (postId: string): CommentWithUser[] => {
      const post = posts.find((p) => p.id === postId);
      if (!post) return [];

      return post.comments
        .map((comment) => {
          const author = getFeedUserById(comment.userId);
          if (!author) return null;
          return { ...comment, author };
        })
        .filter((comment): comment is CommentWithUser => comment !== null)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    },
    [posts]
  );

  // Handle liking a post
  const handleLike = (postId: string) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId ? { ...post, likes: post.likes + 1 } : post
      )
    );
  };

  // Handle adding a comment
  const handleAddComment = (postId: string, content: string) => {
    const newComment: Comment = {
      id: `comment-${Date.now()}`,
      userId: currentFeedUser.id,
      content,
      timestamp: new Date(),
    };

    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? { ...post, comments: [newComment, ...post.comments] }
          : post
      )
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar - Event Shortcuts */}
          <aside className="hidden lg:block lg:col-span-3">
            <div className="sticky top-20">
              <EventShortcuts events={joinedEvents} />
            </div>
          </aside>

          {/* Main Feed */}
          <main className="lg:col-span-6 space-y-4">
            {/* Welcome Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold">Welcome back, {currentFeedUser.name.split(' ')[0]}! 👋</h1>
              <p className="text-muted-foreground text-sm mt-1">
                See what's happening in your volunteer community
              </p>
            </div>

            {/* Feed Items */}
            {mixedFeed.map((item, index) => {
              if (item.type === 'post') {
                return (
                  <FeedPostCard
                    key={`post-${item.data.id}`}
                    post={item.data}
                    comments={getCommentsForPost(item.data.id)}
                    currentUserId={currentFeedUser.id}
                    onLike={handleLike}
                    onAddComment={handleAddComment}
                  />
                );
              } else {
                return (
                  <TrendingEventCard
                    key={`trending-${item.data.id}-${index}`}
                    event={item.data}
                  />
                );
              }
            })}

            {mixedFeed.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-lg font-medium">No activity yet</p>
                <p className="text-sm">Join some events to see activity in your feed!</p>
              </div>
            )}
          </main>

          {/* Right Sidebar - Friend Suggestions */}
          <aside className="hidden lg:block lg:col-span-3">
            <div className="sticky top-20">
              <FriendSuggestions suggestions={friendSuggestions} />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
