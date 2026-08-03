

import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Info, MessageSquare, Star, Users, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import {
  EventHeader,
  EventAbout,
  PostCard,
  CreatePostModal,
  CreatePostTrigger,
  MembersList,
  SearchPosts,
  PostDetailDialog
} from '@/components/discussion';
import { getEventById, getEventPosts, getEventRegistrations } from '@/services/event.service';
import { createPost, likePost } from '@/services/feed.service';
import { createComment, getComments, deletePost, deleteComment } from '@/services/post.service';
import type { PostWithUser, CommentWithUser, DiscussionEvent, DiscussionUser } from '@/types/discussion';
import type { Event } from '@/types/event';

interface RawAuthor {
  _id?: string;
  name?: string;
  username?: string;
  profilePicture?: string;
  image?: string;
  role?: string;
}

interface RawComment {
  _id: string;
  authorId?: string | RawAuthor;
  content: string;
  createdAt: string;
}

interface RawPost {
  _id: string;
  authorId?: string | RawAuthor;
  content?: string;
  image?: string;
  createdAt: string;
  likes?: (string | { _id?: string })[];
}

interface RawRegistration {
  status: string;
  createdAt?: string;
  volunteerId?: { _id?: string; id?: string; name?: string; username?: string; email?: string; profilePicture?: string };
}

function resolveAuthor(authorId: string | RawAuthor | undefined): RawAuthor {
  if (!authorId) return {};
  return typeof authorId === 'string' ? { _id: authorId } : authorId;
}

export default function DiscussionPage() {
  const { eventId, postId } = useParams<{ eventId: string; postId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [posts, setPosts] = useState<PostWithUser[]>([]);
  const [members, setMembers] = useState<(DiscussionUser & { email?: string; joinDate?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);

  const [commentsMap, setCommentsMap] = useState<Record<string, CommentWithUser[]>>({});

  const [selectedPost, setSelectedPost] = useState<PostWithUser | null>(null);
  const isDetailOpen = !!postId;

  useEffect(() => {
    if (postId) {
      const found = posts.find(p => p.id === postId);
      if (found) {
        setSelectedPost(found);
      } else {
        setSelectedPost({
          id: postId,
          userId: 'loading',
          content: '',
          timestamp: new Date(),
          likes: 0,
          likedByMe: false,
          comments: [],
          author: {
            id: 'loading',
            name: 'Loading...',
            avatarUrl: '',
            role: 'volunteer'
          }
        });
      }
    } else {
      setSelectedPost(null);
    }
  }, [postId, posts]);

  const handleCloseDetail = () => {
    navigate(`/events/${eventId}`);
  };

  const fetchComments = async (postId: string) => {
    try {
      const res = await getComments(postId);
      const mappedComments = (res.data || res || []).map((c: RawComment) => {
        const author = resolveAuthor(c.authorId);
        return {
          id: c._id,
          userId: author._id || 'unknown',
          content: c.content,
          timestamp: new Date(c.createdAt),
          author: {
            id: author._id || 'unknown',
            name: author.name || 'Unknown',
            username: author.username,
            avatarUrl: author.profilePicture,
            role: 'volunteer' as const
          }
        };
      });
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

        const approvedMembers = (registrationsData?.data || registrationsData || [])
          .filter((r: RawRegistration) => (r.status === 'approved' || r.status === 'completed') && r.volunteerId)
          .map((r: RawRegistration) => ({
            id: r.volunteerId!._id || r.volunteerId!.id,
            name: r.volunteerId!.name,
            username: r.volunteerId!.username,
            email: r.volunteerId!.email,
            avatarUrl: r.volunteerId!.profilePicture,
            role: 'volunteer',
            joinDate: r.createdAt
          }));
        setMembers(approvedMembers);

        const rawEvent = eventData?.data?.event || eventData?.event || eventData;
        const mappedEvent = {
          ...rawEvent,
          id: rawEvent._id || rawEvent.id,
          date: rawEvent.startAt || rawEvent.date,
          bannerImage: rawEvent.image,
          membersCount: rawEvent.currentMembers || approvedMembers.length,
          members: approvedMembers
        };
        setEvent(mappedEvent);

        const mappedPosts = (postsData.data || postsData || []).map((p: RawPost) => {
          const author = resolveAuthor(p.authorId);
          return {
            id: p._id,
            userId: author._id || 'unknown',
            content: p.content,
            imageUrl: p.image,
            timestamp: new Date(p.createdAt),
            likes: p.likes?.length || 0,
            likedByMe: user ? p.likes?.some((l) => (typeof l === 'string' ? l : l._id) === (user.id || user._id)) : false,
            author: {
              id: author._id || 'unknown',
              name: author.name || 'Unknown',
              username: author.username,
              avatarUrl: author.profilePicture || author.image,
              role: author.role || 'volunteer'
            },
            comments: []
          };
        });

        setPosts(mappedPosts);

        mappedPosts.forEach((post: { id: string }) => {
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

  const featuredPosts = useMemo(() => {
    return posts.filter((post) => post.author.role === 'manager' || post.author.role === 'admin');
  }, [posts]);

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
      const postsData = await getEventPosts(eventId);
      const mappedPosts = (postsData.data || postsData || []).map((p: RawPost) => {
        const author = resolveAuthor(p.authorId);
        return {
          id: p._id,
          userId: author._id || 'unknown',
          content: p.content,
          imageUrl: p.image,
          timestamp: new Date(p.createdAt),
          likes: p.likes?.length || 0,
          likedByMe: user ? p.likes?.some((l) => (typeof l === 'string' ? l : l._id) === (user.id || user._id)) : false,
          author: {
            id: author._id || 'unknown',
            name: author.name || 'Unknown',
            username: author.username,
            avatarUrl: author.profilePicture || author.image,
            role: author.role || 'volunteer'
          },
          comments: []
        };
      });
      setPosts(mappedPosts);
      setIsCreatePostOpen(false);
    } catch (e) {
      console.error(e);
      toast.error("Failed to create post");
    }
  };

  const handleLike = async (postId: string) => {
    try {
      await likePost(postId);
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
    } catch {
      toast.error("Failed to like post");
    }
  };

  const handleAddComment = async (postId: string, content: string) => {
    try {
      await createComment(postId, { content });
      fetchComments(postId);
    } catch {
      toast.error("Failed to add comment");
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      await deletePost(postId);
      setPosts(prev => prev.filter(p => p.id !== postId));
      toast.success("Post deleted successfully");
      if (postId === selectedPost?.id) {
        navigate(`/events/${eventId}`);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete post");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteComment(commentId);
      setCommentsMap(prev => {
        const newMap = { ...prev };
        Object.keys(newMap).forEach(postId => {
          newMap[postId] = newMap[postId].filter(c => c.id !== commentId);
        });
        return newMap;
      });
      toast.success("Comment deleted successfully");
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete comment");
    }
  };

  const handleViewDetail = (postId: string) => {
    navigate(`/events/${eventId}/posts/${postId}`);
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
  }

  if (!event) return <div>Event not found</div>;

  return (
    <div className="min-h-screen bg-background">
      <EventHeader event={{ ...event, members } as unknown as DiscussionEvent} />

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

            <TabsContent value="about" className="mt-6">
              <EventAbout event={event as unknown as DiscussionEvent} />
            </TabsContent>

            <TabsContent value="discussion" className="mt-6">
              <div className="space-y-4">
                <CreatePostTrigger onClick={() => setIsCreatePostOpen(true)} />

                {posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    comments={commentsMap[post.id] || []}
                    currentUserId={user?.id || ''}
                    currentUser={user ? { id: user.id || user._id || '', name: user.name || '', avatarUrl: user.profilePicture || '' } : { id: '', name: 'Unknown', avatarUrl: '' }}
                    onLike={handleLike}
                    onAddComment={handleAddComment}
                    onViewDetail={() => handleViewDetail(post.id)}
                    onDeletePost={handleDeletePost}
                    onDeleteComment={handleDeleteComment}
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
                    currentUser={user ? { id: user.id || user._id || '', name: user.name || '', avatarUrl: user.profilePicture || '' } : { id: '', name: 'Unknown', avatarUrl: '' }}
                    onLike={handleLike}
                    onAddComment={handleAddComment}
                    onViewDetail={() => handleViewDetail(post.id)}
                    onDeletePost={handleDeletePost}
                    onDeleteComment={handleDeleteComment}
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

            <TabsContent value="members" className="mt-6">
              <MembersList
                members={members}
                managerId={typeof event.managerId === 'object' ? event.managerId?._id : event.managerId}
              />
            </TabsContent>

            <TabsContent value="search" className="mt-6">
              <SearchPosts
                posts={posts}
                getCommentsForPost={(id) => commentsMap[id] || []}
                currentUserId={user?.id || ''}
                currentUser={user ? { id: user.id || user._id || '', name: user.name || '', avatarUrl: user.profilePicture || '' } : { id: '', name: 'Unknown', avatarUrl: '' }}
                onLike={handleLike}
                onAddComment={handleAddComment}
                onViewDetail={handleViewDetail}
                onDeletePost={handleDeletePost}
                onDeleteComment={handleDeleteComment}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <CreatePostModal
        open={isCreatePostOpen}
        onOpenChange={setIsCreatePostOpen}
        onPost={async (content, image) => { await handleCreatePost(content, image); }}
      />

      {selectedPost && (
        <PostDetailDialog
          open={isDetailOpen}
          onOpenChange={(open) => !open && handleCloseDetail()}
          post={selectedPost}
          comments={commentsMap[selectedPost.id] || []}
          currentUserId={user?.id || ''}
          currentUser={user ? { id: user.id || user._id || '', name: user.name || '', avatarUrl: user.profilePicture || '' } : { id: '', name: 'Unknown', avatarUrl: '' }}
          onAddComment={(content) => handleAddComment(selectedPost.id, content)}
          onLike={() => handleLike(selectedPost.id)}
          isLiked={selectedPost.likedByMe || false}
          likeCount={selectedPost.likes}
        />
      )}
    </div>
  );
}