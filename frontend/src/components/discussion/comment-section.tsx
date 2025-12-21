// frontend/src/components/discussion/comment-section.tsx

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';
import type { CommentWithUser } from '@/types/discussion';
import { formatRelativeTime } from '@/utils/formatDate';

interface CurrentUser {
  id: string;
  name: string;
  avatarUrl: string;
}

interface CommentSectionProps {
  comments: CommentWithUser[];
  hasMoreComments: boolean;
  totalComments: number;
  currentUser: CurrentUser;
  onViewAllComments?: () => void;
  viewAllCommentsUrl?: string;
  onAddComment: (content: string) => void;
}

export function CommentSection({
  comments,
  hasMoreComments,
  totalComments,
  currentUser,
  onViewAllComments,
  viewAllCommentsUrl,
  onAddComment,
}: CommentSectionProps) {
  const navigate = useNavigate();
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
    <div className="w-full space-y-3">
      {/* View All Comments Button */}
      {hasMoreComments && (
        viewAllCommentsUrl ? (
          <Link
            to={viewAllCommentsUrl}
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            View all {totalComments} comments
          </Link>
        ) : (
          <button
            onClick={onViewAllComments}
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            View all {totalComments} comments
          </button>
        )
      )}

      {/* Comment Previews */}
      {comments.map((comment) => (
        <div key={comment.id} className="flex items-start gap-2">
          <Avatar className="h-7 w-7">
            <AvatarImage src={comment.author.avatarUrl} alt={comment.author.name} />
            <AvatarFallback className="text-xs">
              {getInitials(comment.author.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 bg-muted/50 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-semibold cursor-pointer hover:underline"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/u/${(comment.author as any).username || comment.author.id}`);
                }}
              >
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

      {/* Add Comment Input */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 pt-2">
        <Avatar className="h-7 w-7">
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
            className="flex-1 h-8 text-sm"
          />
          <Button type="submit" size="icon" className="h-8 w-8" disabled={!newComment.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
