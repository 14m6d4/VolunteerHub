// frontend/src/pages/discussion/Discussion.tsx

import { useState, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Info, MessageSquare, Star, Users, Search } from 'lucide-react';
import {
  EventHeader,
  EventAbout,
  PostCard,
  CreatePostModal,
  CreatePostTrigger,
  MembersList,
  SearchPosts,
} from '@/components/discussion';
import { mockEvent, mockPosts, mockUsers, currentUser, getUserById } from '@/data/discussion-mock';
import type { Post, PostWithUser, CommentWithUser, Comment } from '@/types/discussion';

export default function DiscussionPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [posts, setPosts] = useState<Post[]>(mockPosts);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);

  // eslint-disable-next-line no-console
  console.log('Loading event:', eventId);

  // Enrich posts with user data
  const postsWithUsers: PostWithUser[] = useMemo(() => {
    return posts
      .map((post) => {
        const author = getUserById(post.userId);
        if (!author) return null;
        return { ...post, author };
      })
      .filter((post): post is PostWithUser => post !== null)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [posts]);

  // Get featured posts (from managers only)
  const featuredPosts = useMemo(() => {
    return postsWithUsers.filter((post) => post.author.role === 'manager');
  }, [postsWithUsers]);

  // Get comments with user data for a post
  const getCommentsForPost = useCallback((postId: string): CommentWithUser[] => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return [];

    return post.comments
      .map((comment) => {
        const author = getUserById(comment.userId);
        if (!author) return null;
        return { ...comment, author };
      })
      .filter((comment): comment is CommentWithUser => comment !== null)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [posts]);

  // Handle creating a new post
  const handleCreatePost = (content: string, imageUrl?: string) => {
    const newPost: Post = {
      id: `post-${Date.now()}`,
      userId: currentUser.id,
      content,
      imageUrl,
      timestamp: new Date(),
      likes: 0,
      comments: [],
    };
    setPosts((prev) => [newPost, ...prev]);
  };

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
      userId: currentUser.id,
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
      {/* Event Header with Banner */}
      <EventHeader event={mockEvent} />

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
              <EventAbout event={mockEvent} />
            </TabsContent>

            {/* Discussion Tab */}
            <TabsContent value="discussion" className="mt-6">
              <div className="space-y-4">
                {/* Create Post Trigger */}
                <CreatePostTrigger onClick={() => setIsCreatePostOpen(true)} />

                {/* Posts Feed */}
                {postsWithUsers.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    comments={getCommentsForPost(post.id)}
                    currentUserId={currentUser.id}
                    onLike={handleLike}
                    onAddComment={handleAddComment}
                  />
                ))}

                {postsWithUsers.length === 0 && (
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
                    comments={getCommentsForPost(post.id)}
                    currentUserId={currentUser.id}
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
              <MembersList members={mockUsers} />
            </TabsContent>

            {/* Search Tab */}
            <TabsContent value="search" className="mt-6">
              <SearchPosts
                posts={postsWithUsers}
                getCommentsForPost={getCommentsForPost}
                currentUserId={currentUser.id}
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
        onPost={handleCreatePost}
      />
    </div>
  );
}
