// frontend/src/components/discussion/search-posts.tsx

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import type { PostWithUser, CommentWithUser } from '@/types/discussion';
import { PostCard } from './post-card';

interface SearchPostsProps {
  posts: PostWithUser[];
  getCommentsForPost: (postId: string) => CommentWithUser[];
  currentUserId: string;
  currentUser: { id: string; name: string; avatarUrl: string };
  onLike: (postId: string) => void;
  onAddComment: (postId: string, content: string) => void;
  onViewDetail?: (postId: string) => void;
  onDeletePost?: (postId: string) => void;
  onDeleteComment?: (commentId: string) => void;
}

export function SearchPosts({
  posts,
  getCommentsForPost,
  currentUserId,
  currentUser,
  onLike,
  onAddComment,
  onViewDetail,
  onDeletePost,
  onDeleteComment,
}: SearchPostsProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPosts = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase();
    return posts.filter(
      (post) =>
        post.content.toLowerCase().includes(query) ||
        post.author.name.toLowerCase().includes(query)
    );
  }, [posts, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Search posts by content or author name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 h-12 text-base"
        />
      </div>

      {/* Results */}
      {searchQuery.trim() && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {filteredPosts.length} result{filteredPosts.length !== 1 ? 's' : ''} found for "
            {searchQuery}"
          </p>

          {filteredPosts.length > 0 ? (
            <div className="space-y-4">
              {filteredPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  comments={getCommentsForPost(post.id)}
                  currentUserId={currentUserId}
                  currentUser={currentUser}
                  onLike={onLike}
                  onAddComment={onAddComment}
                  onViewDetail={onViewDetail ? () => onViewDetail(post.id) : undefined}
                  onDeletePost={onDeletePost}
                  onDeleteComment={onDeleteComment}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No posts found</p>
              <p className="text-sm">Try searching with different keywords</p>
            </div>
          )}
        </div>
      )}

      {!searchQuery.trim() && (
        <div className="text-center py-12 text-muted-foreground">
          <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Search posts</p>
          <p className="text-sm">Enter a keyword to search posts and authors</p>
        </div>
      )}
    </div>
  );
}
