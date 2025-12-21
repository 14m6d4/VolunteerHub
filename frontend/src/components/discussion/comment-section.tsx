

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Send, Trash2 } from 'lucide-react';
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
  onDeleteComment?: (commentId: string) => void;
}

export function CommentSection({
  comments,
  hasMoreComments,
  totalComments,
  currentUser,
  onViewAllComments,
  viewAllCommentsUrl,
  onAddComment,
  onDeleteComment,
}: CommentSectionProps) {
  const navigate = useNavigate();
  const [newComment, setNewComment] = useState('');
  const [hoveredCommentId, setHoveredCommentId] = useState<string | null>(null);
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      onAddComment(newComment.trim());
      setNewComment('');
    }
  };

  const handleDeleteComment = () => {
    if (onDeleteComment && deleteCommentId) {
      onDeleteComment(deleteCommentId);
      setDeleteCommentId(null);
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
        <div
          key={comment.id}
          className="flex items-start gap-2 group"
          onMouseEnter={() => setHoveredCommentId(comment.id)}
          onMouseLeave={() => setHoveredCommentId(null)}
        >
          <Avatar className="h-7 w-7">
            <AvatarImage src={comment.author.avatarUrl} alt={comment.author.name} />
            <AvatarFallback className="text-xs">
              {getInitials(comment.author.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 bg-muted/50 rounded-lg px-3 py-2 relative">
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
              {currentUser.id === comment.author.id && onDeleteComment && hoveredCommentId === comment.id && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 ml-auto text-muted-foreground hover:text-destructive"
                  onClick={() => setDeleteCommentId(comment.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
            <p className="text-sm text-foreground break-words [overflow-wrap:anywhere]" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{comment.content}</p>
          </div>
        </div>
      ))}

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

      <AlertDialog open={deleteCommentId !== null} onOpenChange={(open) => !open && setDeleteCommentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Comment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this comment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteComment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
