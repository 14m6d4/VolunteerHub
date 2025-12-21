// frontend/src/pages/Feed.tsx

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FeedPostCard, TrendingEventCard, EventShortcuts, FriendSuggestions } from '@/components/feed';
import { useAuth } from '@/context/AuthContext';
import { getFeed, likePost } from '@/services/feed.service';
import { getEvents, getMyRegistrations } from '@/services/event.service';
import { getFriendSuggestions, sendFriendRequest } from '@/services/user.service';
import { createComment } from '@/services/post.service';
import type { FeedPostWithUser, TrendingEvent, FriendSuggestion, EventShortcut } from '@/types/feed';
import { toast } from 'sonner';

// Feed item type for mixed content
type FeedItem =
  | { type: 'post'; data: FeedPostWithUser }
  | { type: 'trending'; data: TrendingEvent };

export default function FeedPage() {
  const { user } = useAuth();
  const { postId } = useParams();
  const navigate = useNavigate();
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [joinedEvents, setJoinedEvents] = useState<EventShortcut[]>([]);
  const [friendSuggestions, setFriendSuggestions] = useState<FriendSuggestion[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch Data
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const promises: Promise<any>[] = [getFeed({ limit: 20 }), getEvents({ status: 'approved' })];

        if (user) {
          promises.push(getMyRegistrations());
          promises.push(getFriendSuggestions());
        }

        const results = await Promise.all(promises);
        const feedRes = results[0];
        const eventsRes = results[1];
        const myRegRes = user ? results[2] : { data: [] };
        const suggestionsRes = user ? results[3] : { data: [] };

        // Process Events for Shortcuts (Joined Events)
        const allEvents = eventsRes.items || [];
        const myRegs = myRegRes.data || myRegRes || [];

        // Extract Joined Events List (Shortcuts)
        const myEventsList: EventShortcut[] = [];
        myRegs.forEach((r: any) => {
          const eId = typeof r.eventId === 'string' ? r.eventId : r.eventId?._id || r.eventId?.id;
          const eventDetails = allEvents.find((e: any) => (e._id || e.id) === eId) || r.eventId;
          if (eventDetails && typeof eventDetails !== 'string') {
            myEventsList.push({
              id: eventDetails._id || eventDetails.id,
              title: eventDetails.title,
              image: eventDetails.image
            });
          }
        });
        setJoinedEvents(myEventsList);

        // Process Mixed Feed from Backend
        const apiFeed = feedRes.data || feedRes || [];
        const mappedFeed: FeedItem[] = apiFeed.map((item: any) => {
          if (item.type === 'post') {
            if (!user) return null; // Guests shouldn't see posts
            const p = item.data;
            return {
              type: 'post',
              data: {
                id: p._id,
                userId: p.authorId._id,
                content: p.content,
                imageUrl: p.image,
                timestamp: new Date(p.createdAt),
                likes: p.likes?.length || 0,
                likedByMe: user ? p.likes?.includes(user.id) : false,
                eventId: p.eventId?._id,
                eventTitle: p.eventId?.title || 'Unknown Event',
                eventImage: p.eventId?.image || '',
                author: {
                  id: p.authorId._id,
                  name: p.authorId.name,
                  username: p.authorId.username,
                  avatarUrl: p.authorId.profilePicture,
                  role: p.authorId.role
                },
                comments: (p.comments || []).map((c: any) => ({
                  id: c._id,
                  userId: c.authorId._id,
                  content: c.content,
                  timestamp: new Date(c.createdAt),
                  author: {
                    id: c.authorId._id,
                    name: c.authorId.name,
                    username: c.authorId.username,
                    avatarUrl: c.authorId.profilePicture,
                    role: 'volunteer'
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
                case 'rapid_growth':
                  reason = `${count} members joined in ${timeStr}`;
                  break;
                case 'active_community':
                  reason = `${count} new posts in ${timeStr}`;
                  break;
                case 'hot_discussion':
                  reason = `${count} new comments in ${timeStr}`;
                  break;
                default:
                  reason = 'Trending now in your community';
              }
            }
            return {
              type: 'trending',
              data: {
                id: e._id,
                title: e.title,
                image: e.image,
                date: new Date(e.startAt).toLocaleDateString(),
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

        // Process Suggestions
        const rawSuggestions = suggestionsRes.data || suggestionsRes || [];
        const suggestions: FriendSuggestion[] = rawSuggestions.map((u: any) => ({
          id: u._id,
          name: u.name || u.username,
          username: u.username,
          avatarUrl: u.profilePicture,
          mutualFriends: u.mutualFriends || 0
        }));
        setFriendSuggestions(suggestions);

      } catch (err) {
        console.error("Failed to load feed", err);
        toast.error("Failed to load feed data");
      } finally {
        setLoading(false);
      }
    }
    loadData();
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

  const handleSendFriendRequest = async (userId: string) => {
    try {
      await sendFriendRequest(userId);
    } catch (e) {
      console.error(e);
      toast.error("Failed to send friend request");
      throw e;
    }
  };

  if (loading) return <div className="flex justify-center p-10">Loading feed...</div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar - Event Shortcuts */}
          <aside className="hidden lg:block lg:col-span-3">
            <div className="sticky top-20">
              {user && <EventShortcuts events={joinedEvents} />}
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
            {feedItems.map((item, index) => {
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

            {feedItems.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-lg font-medium">No activity yet</p>
                <p className="text-sm">Join some events to see activity in your feed!</p>
              </div>
            )}
          </main>

          {/* Right Sidebar - Friend Suggestions */}
          <aside className="hidden lg:block lg:col-span-3">
            <div className="sticky top-20">
              {user && <FriendSuggestions suggestions={friendSuggestions} onAddFriend={handleSendFriendRequest} />}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
