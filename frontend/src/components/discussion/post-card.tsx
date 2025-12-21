

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
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
import { Heart, MessageCircle, Flag, Trash2 } from 'lucide-react';
import type { PostWithUser, CommentWithUser } from '@/types/discussion';
import { CommentSection } from './comment-section';
import { ReportDialog } from './report-dialog';
import { PostDetailDialog } from './post-detail-dialog';
import { formatRelativeTime } from '@/utils/formatDate';

interface PostCardProps {
  post: PostWithUser;
  comments: CommentWithUser[];
  currentUserId: string;
  currentUser: { id: string; name: string; avatarUrl: string };
  onLike: (postId: string) => void;
  onAddComment: (postId: string, content: string) => void;
  onViewDetail?: () => void;
  onDeletePost?: (postId: string) => void;
  onDeleteComment?: (commentId: string) => void;
}

export function PostCard({
  post,
  comments,
  currentUserId,
  currentUser,
  onLike,
  onAddComment,
  onViewDetail,
  onDeletePost,
  onDeleteComment,
}: PostCardProps) {
  const navigate = useNavigate();
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes);

  const handleLike = () => {
    if (!isLiked) {
      setLikeCount((prev) => prev + 1);
      setIsLiked(true);
      onLike(post.id);
    } else {
      setLikeCount((prev) => prev - 1);
      setIsLiked(false);
    }
  };

  const handleDeletePost = () => {
    if (onDeletePost) {
      onDeletePost(post.id);
      setShowDeleteDialog(false);
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

  const previewComments = comments.slice(0, 2);
  const hasMoreComments = comments.length > 2;

  return (
    <>
      <Card className="w-full shadow-md hover:shadow-lg transition-shadow">
        {/* Header */}
        <CardHeader className="pb-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={post.author.avatarUrl} alt={post.author.name} />
                <AvatarFallback>{getInitials(post.author.name)}</AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <p
                    className="font-semibold text-sm cursor-pointer hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/u/${post.author.username || post.author.id}`);
                    }}
                  >
                    {post.author.name}
                  </p>
                  {post.author.role === 'manager' && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                      Manager
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatRelativeTime(post.timestamp)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {currentUserId === post.author.id && onDeletePost && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => setShowReportDialog(true)}
              >
                <Flag className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Body */}
        <CardContent className="pb-3 pt-0 overflow-hidden">
          <p className="text-sm whitespace-pre-wrap break-words [overflow-wrap:anywhere]" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{post.content}</p>
          {post.imageUrl && (
            <div className="rounded-lg overflow-hidden mt-3">
              <img
                src={post.imageUrl}
                alt="Post image"
                className="w-full h-auto object-cover max-h-96"
              />
            </div>
          )}
        </CardContent>

        {/* Footer Stats */}
        <CardFooter className="flex flex-col gap-3 pt-0">
          <div className="w-full flex items-center gap-4 text-sm text-muted-foreground">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1 hover:text-red-500 transition-colors ${isLiked ? 'text-red-500' : ''
                }`}
            >
              <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
              <span>{likeCount}</span>
            </button>
            <button
              onClick={() => onViewDetail ? onViewDetail() : setShowDetailDialog(true)}
              className="flex items-center gap-1 hover:text-primary transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              <span>{comments.length}</span>
            </button>
          </div>

          <Separator />

          {/* Comments Section */}
          <CommentSection
            comments={previewComments}
            hasMoreComments={hasMoreComments}
            totalComments={comments.length}
            currentUser={currentUser}
            onViewAllComments={() => onViewDetail ? onViewDetail() : setShowDetailDialog(true)}
            onAddComment={(content: string) => onAddComment(post.id, content)}
            onDeleteComment={onDeleteComment}
          />
        </CardFooter>
      </Card >

      {/* Report Dialog */}
      < ReportDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        postId={post.id}
      />

      {/* Post Detail Dialog */}
      < PostDetailDialog
        open={showDetailDialog}
        onOpenChange={setShowDetailDialog}
        post={post}
        comments={comments}
        currentUserId={currentUserId}
        currentUser={currentUser}
        onAddComment={(content: string) => onAddComment(post.id, content)
        }
        onLike={() => handleLike()}
        isLiked={isLiked}
        likeCount={likeCount}
        onDeleteComment={onDeleteComment}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePost}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}