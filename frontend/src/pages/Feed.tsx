// frontend/src/pages/Feed.tsx

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FeedPostCard, TrendingEventCard, EventShortcuts, FriendSuggestions } from '@/components/feed';
import { useAuth } from '@/context/AuthContext';
import { getFeed, likePost } from '@/services/feed.service';
import { getMyRegistrations, getEvents } from '@/services/event.service';
import { getFriendSuggestions, sendFriendRequest } from '@/services/user.service';
import { createComment, deletePost, deleteComment } from '@/services/post.service';
import type { FeedPostWithUser, TrendingEvent, FriendSuggestion, EventShortcut } from '@/types/feed';
import { toast } from 'sonner';
import { formatEventDate } from '@/utils/formatDate';

// Feed item type for mixed content
type FeedItem =
  | { type: 'post'; data: FeedPostWithUser }
  | { type: 'trending'; data: TrendingEvent };

export default function FeedPage() {
  const { user } = useAuth();
  // State now holds mixed items directly
  const { postId } = useParams();
  const navigate = useNavigate();
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [joinedEvents, setJoinedEvents] = useState<EventShortcut[]>([]);
  const [friendSuggestions, setFriendSuggestions] = useState<FriendSuggestion[]>([]);

  const [feedLoading, setFeedLoading] = useState(true);
  const [shortcutsLoading, setShortcutsLoading] = useState(true);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);

  // Fetch Data
  useEffect(() => {
    async function loadFeed() {
      setFeedLoading(true);
      try {
        const feedRes = await getFeed({ limit: 20 });
        const apiFeed = feedRes.data || feedRes || [];
        const mappedFeed: FeedItem[] = apiFeed.map((item: any) => {
          if (item.type === 'post') {
            if (!user) return null;
            const p = item.data;
            if (!p.authorId) return null; // Skip posts with deleted authors

            return {
              type: 'post',
              data: {
                id: p._id,
                userId: p.authorId?._id || 'deleted',
                content: p.content,
                imageUrl: p.image,
                timestamp: new Date(p.createdAt),
                likes: p.likes?.length || 0,
                likedByMe: user ? p.likes?.includes(user.id) : false,
                eventId: p.eventId?._id,
                eventTitle: p.eventId?.title || 'Unknown Event',
                eventImage: p.eventId?.image || '',
                author: {
                  id: p.authorId?._id || 'deleted',
                  name: p.authorId?.name || 'Deleted User',
                  username: p.authorId?.username || 'deleted',
                  avatarUrl: p.authorId?.profilePicture,
                  role: p.authorId?.role || 'volunteer'
                },
                comments: (p.comments || [])
                  .filter((c: any) => c.authorId)
                  .map((c: any) => ({
                    id: c._id,
                    userId: c.authorId._id,
                    content: c.content,
                    timestamp: new Date(c.createdAt),
                    author: {
                      id: c.authorId._id,
                      name: c.authorId.name,
                      username: c.authorId.username,
                      avatarUrl: c.authorId.profilePicture,
                      role: c.authorId.role || 'volunteer'
                    }
                  })),
                commentCount: p.commentCount || 0
              }
            };
          } else if (item.type === 'trending') {
            const e = item.data;
            let reason = 'Recommended for you';
            if (e.bestFeature && e.bestFeature.count > 0) {
              const { type, count, days } = e.bestFeature;
              const timeStr = `${days} days`;
              switch (type) {
                case 'rapid_growth': reason = `${count} members joined in ${timeStr}`; break;
                case 'active_community': reason = `${count} new posts in ${timeStr}`; break;
                case 'hot_discussion': reason = `${count} new comments in ${timeStr}`; break;
                default: reason = 'Trending now in your community';
              }
            }
            return {
              type: 'trending',
              data: {
                id: e._id,
                title: e.title,
                image: e.image,
                date: formatEventDate(e.startAt),
                location: e.location,
                membersCount: e.currentMembers || 0,
                tags: e.tags || [],
                description: e.description,
                isTrending: true,
                trendingReason: reason
              }
            };
          }
          return null;
        }).filter((item: FeedItem | null) => item !== null) as FeedItem[];
        setFeedItems(mappedFeed);
      } catch (err) {
        console.error("Failed to load feed", err);
        toast.error("Failed to load feed data");
      } finally {
        setFeedLoading(false);
      }
    }

    async function loadShortcuts() {
      if (!user) {
        setShortcutsLoading(false);
        return;
      }
      setShortcutsLoading(true);
      try {
        if (user.role === 'manager') {
          const managedRes = await getEvents({ managerId: user.id, status: 'all' });
          const managedEvents = managedRes.items || [];
          setJoinedEvents(managedEvents.map((e: any) => ({
            id: e._id || e.id,
            title: e.title,
            image: e.image
          })));
        } else {
          const myRegRes = await getMyRegistrations();
          const myRegs = myRegRes.data || myRegRes || [];
          const myEventsList: EventShortcut[] = myRegs
            .filter((r: any) => r.eventId && typeof r.eventId !== 'string')
            .map((r: any) => ({
              id: r.eventId._id || r.eventId.id,
              title: r.eventId.title,
              image: r.eventId.image
            }));
          setJoinedEvents(myEventsList);
        }
      } catch (err) {
        console.error("Failed to load shortcuts", err);
      } finally {
        setShortcutsLoading(false);
      }
    }

    async function loadSuggestions() {
      if (!user) {
        setSuggestionsLoading(false);
        return;
      }
      setSuggestionsLoading(true);
      try {
        const suggestionsRes = await getFriendSuggestions();
        const rawSuggestions = suggestionsRes.data || suggestionsRes || [];
        const suggestions: FriendSuggestion[] = rawSuggestions.map((u: any) => ({
          id: u._id,
          name: u.name || u.username,
          username: u.username,
          avatarUrl: u.profilePicture,
          mutualFriends: u.mutualFriends || 0
        }));
        setFriendSuggestions(suggestions.slice(0, 5));

      } catch (err) {
        console.error("Failed to load suggestions", err);
      } finally {
        setSuggestionsLoading(false);
      }
    }

    loadFeed();
    loadShortcuts();
    loadSuggestions();
  }, [user]);

  // Handle liking
  const handleLike = async (postId: string) => {
    if (!user) {
      toast.error("Please login to like posts");
      return;
    }
    try {
      await likePost(postId);
      setFeedItems((prev) =>
        prev.map((item) => {
          if (item.type === 'post' && item.data.id === postId) {
            const isLiked = !item.data.likedByMe;
            return {
              ...item,
              data: {
                ...item.data,
                likedByMe: isLiked,
                likes: item.data.likes + (isLiked ? 1 : -1)
              }
            };
          }
          return item;
        })
      );
    } catch (e) {
      console.error(e);
      toast.error("Failed to like post");
    }
  };

  // Handle adding comment
  const handleAddComment = async (postId: string, content: string) => {
    if (!user) {
      toast.error("Please login to comment");
      return;
    }
    try {
      const res = await createComment(postId, { content });
      const newComment = {
        id: res.data?._id || `temp-${Date.now()}`,
        userId: user.id,
        content: content,
        timestamp: new Date(),
        author: {
          id: user.id,
          name: user.name,
          avatarUrl: user.profilePicture || '',
          role: user.role
        }
      };

      setFeedItems((prev) =>
        prev.map((item) =>
          (item.type === 'post' && item.data.id === postId)
            ? {
              ...item,
              data: {
                ...item.data,
                comments: [newComment, ...item.data.comments],
                commentCount: item.data.commentCount + 1
              }
            }
            : item
        )
      );
    } catch (e) {
      console.error(e);
      toast.error("Failed to add comment");
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      await deletePost(postId);
      setFeedItems(prev => prev.filter(item => !(item.type === 'post' && item.data.id === postId)));
      toast.success("Post deleted successfully");
      // If we're viewing this post detail, navigate back
      if (postId === postId) {
        navigate('/feed');
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete post");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteComment(commentId);
      // Update feedItems by removing the deleted comment from the post
      setFeedItems(prev => prev.map(item => {
        if (item.type === 'post') {
          return {
            ...item,
            data: {
              ...item.data,
              comments: item.data.comments.filter(c => c.id !== commentId),
              commentCount: Math.max(0, item.data.commentCount - 1)
            }
          };
        }
        return item;
      }));
      toast.success("Comment deleted successfully");
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete comment");
    }
  };

  const handleSendFriendRequest = async (userId: string) => {
    try {
      await sendFriendRequest(userId);
    } catch (e) {
      console.error(e);
      toast.error("Failed to send friend request");
      throw e;
    }
  };

  // Removed: if (loading) return <div className="flex justify-center p-10">Loading feed...</div>;
  // Page layout will render immediately, and each component will handle its own empty/loading state

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar - Event Shortcuts */}
          <aside className="hidden lg:block lg:col-span-3">
            <div className="sticky top-20">
              {user && (
                shortcutsLoading ? (
                  <div className="p-4 border rounded-lg animate-pulse bg-muted/20">Loading shortcuts...</div>
                ) : (
                  <EventShortcuts events={joinedEvents.slice(0, 5)} />
                )
              )}
            </div>
          </aside>

          {/* Main Feed */}
          <main className="lg:col-span-6 space-y-4">
            {/* Welcome Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold">
                {user ? `Welcome back, ${user.name?.split(' ')[0] || user.username}! 👋` : 'Explore Volunteering Opportunities 🌍'}
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                {user ? "See what's happening in your volunteer community" : "Find and join impactful events in your area"}
              </p>
            </div>

            {/* Feed Items (Mixed) */}
            {feedLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-64 border rounded-lg animate-pulse bg-muted/10" />
                ))}
              </div>
            ) : (
              feedItems.map((item, index) => {
                if (item.type === 'post') {
                  if (!user) return null;
                  return (
                    <FeedPostCard
                      key={`post-${item.data.id}`}
                      post={item.data}
                      comments={item.data.comments}
                      currentUserId={user.id}
                      currentUser={{
                        id: user.id,
                        name: user.name,
                        avatarUrl: user.profilePicture || ''
                      }}
                      onLike={handleLike}
                      onAddComment={handleAddComment}
                      isDetailOpen={postId === item.data.id}
                      onDetailOpenChange={(open) => {
                        if (!open) {
                          navigate('/feed');
                        }
                      }}
                      onDeletePost={handleDeletePost}
                      onDeleteComment={handleDeleteComment}
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
              })
            )}

            {!feedLoading && feedItems.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-lg font-medium">No activity yet</p>
                <p className="text-sm">Join some events to see activity in your feed!</p>
              </div>
            )}
          </main>

          {/* Right Sidebar - Friend Suggestions */}
          <aside className="hidden lg:block lg:col-span-3">
            <div className="sticky top-20">
              {user && (
                suggestionsLoading ? (
                  <div className="p-4 border rounded-lg animate-pulse bg-muted/20">Loading suggestions...</div>
                ) : (
                  <FriendSuggestions suggestions={friendSuggestions.slice(0, 5)} onAddFriend={handleSendFriendRequest} />
                )
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
