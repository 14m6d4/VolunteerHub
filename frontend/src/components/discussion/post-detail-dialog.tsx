// frontend/src/components/discussion/post-detail-dialog.tsx

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Heart, Send, Loader2 } from 'lucide-react';
import type { PostWithUser, CommentWithUser } from '@/types/discussion';
import { formatRelativeTime } from '@/utils/formatDate';
import { getPostById, getComments } from '@/services/post.service';

interface PostDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: PostWithUser;
  comments: CommentWithUser[];
  currentUserId: string;
  currentUser: { id: string; name: string; avatarUrl: string };
  onAddComment: (content: string) => void;
  onLike: () => void;
  isLiked: boolean;
  likeCount: number;
}

export function PostDetailDialog({
  open,
  onOpenChange,
  post: initialPost,
  comments: initialComments,
  onAddComment,
  currentUser,
  onLike,
  isLiked: initialIsLiked,
  likeCount: initialLikeCount,
}: PostDetailDialogProps) {
  const [newComment, setNewComment] = useState('');
  const [fetchedPost, setFetchedPost] = useState<PostWithUser | null>(null);
  const [fetchedComments, setFetchedComments] = useState<CommentWithUser[]>([]);
  const [loading, setLoading] = useState(false);

  // Use fetched data if available, otherwise props (optimistic/initial)
  const displayPost = fetchedPost || initialPost;
  const displayLikeCount = fetchedPost ? fetchedPost.likes : initialLikeCount;
  // Fallback to initialIsLiked if fetchedPost.likedByMe is undefined
  const displayIsLiked = fetchedPost && typeof fetchedPost.likedByMe !== 'undefined' ? fetchedPost.likedByMe : initialIsLiked;
  const displayComments = loading ? initialComments : (fetchedComments.length > 0 ? fetchedComments : initialComments);

  useEffect(() => {
    if (open && initialPost.id) {
      setLoading(true);
      Promise.all([
        getPostById(initialPost.id),
        getComments(initialPost.id)
      ]).then(([postData, commentsData]) => {
        // Map backend post to frontend PostWithUser
        const mappedPost: PostWithUser = {
          id: postData._id,
          userId: postData.authorId._id,
          content: postData.content,
          imageUrl: postData.image,
          timestamp: new Date(postData.createdAt),
          likes: postData.likes.length,
          likedByMe: postData.likes.some((l: any) => (l._id || l) === currentUser.id),
          commentCount: commentsData?.length || 0,
          author: {
            id: postData.authorId._id,
            name: postData.authorId.name,
            avatarUrl: postData.authorId.image,
            role: postData.authorId.role || 'volunteer'
          }
        };
        setFetchedPost(mappedPost);

        // Map backend comments to frontend CommentWithUser
        // Assuming commentsData is array of backend comments
        const mappedComments: CommentWithUser[] = Array.isArray(commentsData) ? commentsData.map((c: any) => ({
          id: c._id,
          userId: c.authorId._id || c.authorId, // Fallback
          content: c.content,
          timestamp: new Date(c.createdAt),
          author: {
            id: c.authorId._id,
            name: c.authorId.name,
            avatarUrl: c.authorId.profilePicture || c.authorId.image, // Check this field from backend
            role: c.authorId.role || 'volunteer'
          }
        })) : [];
        setFetchedComments(mappedComments);
      }).catch(err => {
        console.error("Failed to fetch post details", err);
      }).finally(() => {
        setLoading(false);
      });
    } else {
      // Reset when closed or id changes (if controlled externally)
      // Actually if open is false, we don't necessarily need to clear, but it's cleaner.
      // If we want to keep cache, we might need more complex logic.
      // For "refresh on open", this is fine.
      setFetchedPost(null);
      setFetchedComments([]);
    }
  }, [open, initialPost.id, currentUser.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      onAddComment(newComment.trim());
      setNewComment('');
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] p-0 gap-0">
        <DialogHeader className="p-4 pb-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={displayPost.author.avatarUrl} alt={displayPost.author.name} />
              <AvatarFallback>{getInitials(displayPost.author.name)}</AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-base font-semibold">{displayPost.author.name}</DialogTitle>
              <p className="text-xs text-muted-foreground">
                {formatRelativeTime(displayPost.timestamp)}
              </p>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        <ScrollArea className="max-h-[60vh]">
          <div className="p-4 space-y-4">
            {/* Post Content */}
            <p className="text-sm whitespace-pre-wrap">{displayPost.content}</p>

            {displayPost.imageUrl && (
              <div className="rounded-lg overflow-hidden">
                <img
                  src={displayPost.imageUrl}
                  alt="Post image"
                  className="w-full h-auto object-cover max-h-80"
                />
              </div>
            )}

            {/* Likes */}
            <div className="flex items-center gap-4 pt-2">
              <button
                onClick={onLike}
                className={`flex items-center gap-1 text-sm hover:text-red-500 transition-colors ${displayIsLiked ? 'text-red-500' : 'text-muted-foreground'
                  }`}
              >
                <Heart className={`h-4 w-4 ${displayIsLiked ? 'fill-current' : ''}`} />
                <span>{displayLikeCount} likes</span>
              </button>
            </div>

            <Separator />

            {/* All Comments */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold">
                Comments ({displayComments.length})
              </h4>
              {loading && fetchedComments.length === 0 ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : displayComments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No comments yet. Be the first to comment!
                </p>
              ) : (
                <div className="space-y-3">
                  {displayComments.map((comment) => (
                    <div key={comment.id} className="flex items-start gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={comment.author.avatarUrl}
                          alt={comment.author.name}
                        />
                        <AvatarFallback className="text-xs">
                          {getInitials(comment.author.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 bg-muted/50 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">
                            {comment.author.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeTime(comment.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm text-foreground">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <Separator />

        {/* Add Comment */}
        <form onSubmit={handleSubmit} className="p-4 flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
            <AvatarFallback className="text-xs">
              {getInitials(currentUser.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 flex gap-2">
            <Input
              placeholder="Write a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={!newComment.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
