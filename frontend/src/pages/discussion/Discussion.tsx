// frontend/src/pages/discussion/Discussion.tsx

import { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Info, MessageSquare, Star, Users, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import {
  EventHeader,
  EventAbout,
  PostCard,
  CreatePostModal,
  CreatePostTrigger,
  MembersList,
  SearchPosts,
} from '@/components/discussion';
import { getEventById, getEventPosts, getEventRegistrations } from '@/services/event.service';
import { createPost, likePost } from '@/services/feed.service';
import { createComment, getComments } from '@/services/post.service';
import type { PostWithUser, CommentWithUser } from '@/types/discussion';
import type { Event } from '@/types/event';

export default function DiscussionPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [posts, setPosts] = useState<PostWithUser[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);

  // Local cache for comments to avoid refetching heavily
  // mapping postId -> comments
  const [commentsMap, setCommentsMap] = useState<Record<string, CommentWithUser[]>>({});

  const fetchComments = async (postId: string) => {
    try {
      const res = await getComments(postId);
      // Map backend comments (populated author) to frontend CommentWithUser
      const mappedComments = (res.data || res || []).map((c: any) => ({
        id: c._id,
        userId: c.authorId?._id || c.authorId,
        content: c.content,
        timestamp: new Date(c.createdAt),
        author: {
          id: c.authorId?._id || 'unknown',
          name: c.authorId?.name || 'Unknown',
          avatar: c.authorId?.profilePicture,
          role: 'volunteer' // backend might not populated role on comment author yet, assume volunteer or populate
        }
      }));
      setCommentsMap(prev => ({ ...prev, [postId]: mappedComments }));
    } catch (e) {
      console.error(`Failed to fetch comments for ${postId}`, e);
    }
  };

  useEffect(() => {
    async function loadData() {
      if (!eventId) return;
      setLoading(true);
      try {
        const [eventData, postsData, registrationsData] = await Promise.all([
          getEventById(eventId),
          getEventPosts(eventId),
          getEventRegistrations(eventId)
        ]);
        // Map members
        const approvedMembers = (registrationsData?.data || registrationsData || [])
          .filter((r: any) => r.status === 'approved' && r.volunteerId)
          .map((r: any) => ({
            id: r.volunteerId._id || r.volunteerId.id,
            name: r.volunteerId.name,
            username: r.volunteerId.name, // fallback
            email: r.volunteerId.email,
            avatar: r.volunteerId.image,
            role: 'volunteer', // default
            joinDate: r.createdAt
          }));
        setMembers(approvedMembers);

        // Map backend event to frontend DiscussionEvent
        const rawEvent = eventData?.data?.event || eventData?.event || eventData;
        const mappedEvent: any = {
          ...rawEvent,
          id: rawEvent._id || rawEvent.id,
          date: rawEvent.startAt || rawEvent.date,
          bannerImage: rawEvent.image, // Map backend image field
          membersCount: rawEvent.currentMembers || approvedMembers.length,
          members: approvedMembers
        };
        setEvent(mappedEvent);

        // Transform backend posts to frontend PostWithUser
        // Backend returns Populate authorId.
        // We need to map it.
        const mappedPosts = (postsData.data || postsData || []).map((p: any) => ({
          id: p._id,
          userId: p.authorId?._id || p.authorId,
          content: p.content,
          imageUrl: p.image,
          timestamp: new Date(p.createdAt),
          likes: p.likes?.length || 0,
          likedByMe: user ? p.likes?.some((l: any) => (l._id || l) === user.id) : false,
          author: {
            id: p.authorId?._id || 'unknown',
            name: p.authorId?.name || 'Unknown',
            avatar: p.authorId?.image,
            role: p.authorId?.role || 'volunteer'
          },
          comments: [] // Init empty, fetch separate
        }));

        setPosts(mappedPosts);

        // Fetch comments for all these posts (Simple approach)
        // In producton: Lazy load. Here: Load all for "all info displayed" request
        mappedPosts.forEach((post: any) => {
          fetchComments(post.id);
        });

      } catch (err) {
        console.error(err);
        toast.error("Failed to load discussion");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [eventId, user]);



  // Get featured posts (from managers only)
  const featuredPosts = useMemo(() => {
    return posts.filter((post) => post.author.role === 'manager' || post.author.role === 'admin');
  }, [posts]);

  // Handle creating a new post
  const handleCreatePost = async (content: string, imageFile?: File) => {
    if (!eventId || !user) return;
    try {
      const formData = new FormData();
      formData.append('eventId', eventId);
      formData.append('content', content);
      if (imageFile) {
        formData.append('image', imageFile);
      }

      await createPost(formData);
      toast.success("Post created");
      // Reload posts
      const postsData = await getEventPosts(eventId);
      const mappedPosts = (postsData.data || postsData || []).map((p: any) => ({
        id: p._id,
        userId: p.authorId?._id || p.authorId,
        content: p.content,
        imageUrl: p.image,
        timestamp: new Date(p.createdAt),
        likes: p.likes?.length || 0,
        likedByMe: user ? p.likes?.some((l: any) => (l._id || l) === user.id) : false,
        author: {
          id: p.authorId?._id || 'unknown',
          name: p.authorId?.name || 'Unknown',
          avatar: p.authorId?.image,
          role: p.authorId?.role || 'volunteer'
        },
        comments: []
      }));
      setPosts(mappedPosts);
      setIsCreatePostOpen(false);
    } catch (e) {
      console.error(e);
      toast.error("Failed to create post");
    }
  };

  // Handle liking a post
  const handleLike = async (postId: string) => {
    try {
      await likePost(postId);
      // Optimistic update
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          const liked = !p.likedByMe;
          return {
            ...p,
            likedByMe: liked,
            likes: p.likes + (liked ? 1 : -1)
          };
        }
        return p;
      }));
    } catch (e) {
      toast.error("Failed to like post");
    }
  };

  // Handle adding a comment
  const handleAddComment = async (postId: string, content: string) => {
    try {
      await createComment(postId, { content });
      fetchComments(postId); // Reload comments
    } catch (e) {
      toast.error("Failed to add comment");
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
  }

  if (!event) return <div>Event not found</div>;

  return (
    <div className="min-h-screen bg-background">
      {/* Event Header with Banner */}
      <EventHeader event={{ ...event, members } as any} />

      {/* Tabs Navigation */}
      {/* Tabs Navigation */}
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue="discussion" className="w-full">
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="about" className="gap-2">
                <Info className="h-4 w-4" />
                <span className="hidden sm:inline">About</span>
              </TabsTrigger>
              <TabsTrigger value="discussion" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                <span className="hidden sm:inline">Discussion</span>
              </TabsTrigger>
              <TabsTrigger value="featured" className="gap-2">
                <Star className="h-4 w-4" />
                <span className="hidden sm:inline">Featured</span>
              </TabsTrigger>
              <TabsTrigger value="members" className="gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Members</span>
              </TabsTrigger>
              <TabsTrigger value="search" className="gap-2">
                <Search className="h-4 w-4" />
                <span className="hidden sm:inline">Search</span>
              </TabsTrigger>
            </TabsList>

            {/* About Tab */}
            <TabsContent value="about" className="mt-6">
              <EventAbout event={event as any} />
            </TabsContent>

            {/* Discussion Tab */}
            <TabsContent value="discussion" className="mt-6">
              <div className="space-y-4">
                {/* Create Post Trigger */}
                <CreatePostTrigger onClick={() => setIsCreatePostOpen(true)} />

                {/* Posts Feed */}
                {posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    comments={commentsMap[post.id] || []}
                    currentUserId={user?.id || ''}
                    currentUser={user ? { id: user.id, name: user.name, avatarUrl: user.profilePicture || '' } : { id: '', name: 'Unknown', avatarUrl: '' }}
                    onLike={handleLike}
                    onAddComment={handleAddComment}
                  />
                ))}

                {posts.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No posts yet</p>
                    <p className="text-sm">Be the first to share something!</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Featured Tab */}
            <TabsContent value="featured" className="mt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Star className="h-5 w-5 text-yellow-500" />
                  <h3 className="font-semibold">Posts from Event Managers</h3>
                </div>

                {featuredPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    comments={commentsMap[post.id] || []}
                    currentUserId={user?.id || ''}
                    currentUser={user ? { id: user.id, name: user.name, avatarUrl: user.profilePicture || '' } : { id: '', name: 'Unknown', avatarUrl: '' }}
                    onLike={handleLike}
                    onAddComment={handleAddComment}
                  />
                ))}

                {featuredPosts.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No featured posts</p>
                    <p className="text-sm">Posts from managers will appear here</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Members Tab */}
            <TabsContent value="members" className="mt-6">
              <MembersList
                members={members}
                managerId={typeof event.managerId === 'object' ? (event.managerId as any)._id : event.managerId}
              />
            </TabsContent>

            {/* Search Tab */}
            <TabsContent value="search" className="mt-6">
              <SearchPosts
                posts={posts}
                getCommentsForPost={(id) => commentsMap[id] || []}
                currentUserId={user?.id || ''}
                currentUser={user ? { id: user.id, name: user.name, avatarUrl: user.profilePicture || '' } : { id: '', name: 'Unknown', avatarUrl: '' }}
                onLike={handleLike}
                onAddComment={handleAddComment}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Create Post Modal */}
      <CreatePostModal
        open={isCreatePostOpen}
        onOpenChange={setIsCreatePostOpen}
        onPost={async (content, image) => { await handleCreatePost(content, image as any); }}
      />
    </div>
  );
}
