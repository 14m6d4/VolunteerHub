// frontend/src/components/discussion/post-detail-dialog.tsx

import { useState } from 'react';
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
import { Heart, Send } from 'lucide-react';
import type { PostWithUser, CommentWithUser } from '@/types/discussion';
import { formatRelativeTime } from '@/utils/formatDate';

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
  post,
  comments,
  onAddComment,
  currentUser,
  onLike,
  isLiked,
  likeCount,
}: PostDetailDialogProps) {
  const [newComment, setNewComment] = useState('');

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
              <AvatarImage src={post.author.avatarUrl} alt={post.author.name} />
              <AvatarFallback>{getInitials(post.author.name)}</AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-base font-semibold">{post.author.name}</DialogTitle>
              <p className="text-xs text-muted-foreground">
                {formatRelativeTime(post.timestamp)}
              </p>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        <ScrollArea className="max-h-[60vh]">
          <div className="p-4 space-y-4">
            {/* Post Content */}
            <p className="text-sm whitespace-pre-wrap">{post.content}</p>

            {post.imageUrl && (
              <div className="rounded-lg overflow-hidden">
                <img
                  src={post.imageUrl}
                  alt="Post image"
                  className="w-full h-auto object-cover max-h-80"
                />
              </div>
            )}

            {/* Likes */}
            <div className="flex items-center gap-4 pt-2">
              <button
                onClick={onLike}
                className={`flex items-center gap-1 text-sm hover:text-red-500 transition-colors ${isLiked ? 'text-red-500' : 'text-muted-foreground'
                  }`}
              >
                <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                <span>{likeCount} likes</span>
              </button>
            </div>

            <Separator />

            {/* All Comments */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold">
                Comments ({comments.length})
              </h4>
              {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No comments yet. Be the first to comment!
                </p>
              ) : (
                <div className="space-y-3">
                  {comments.map((comment) => (
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
