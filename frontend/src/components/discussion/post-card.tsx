// frontend/src/components/discussion/post-card.tsx

import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Heart, MessageCircle, Flag } from 'lucide-react';
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
}

export function PostCard({
  post,
  comments,
  currentUserId,
  currentUser,
  onLike,
  onAddComment,
}: PostCardProps) {
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
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
                <AvatarImage src={post.author.avatar} alt={post.author.name} />
                <AvatarFallback>{getInitials(post.author.name)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-sm">{post.author.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatRelativeTime(post.timestamp)}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => setShowReportDialog(true)}
            >
              <Flag className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        {/* Body */}
        <CardContent className="pb-3 pt-0">
          <p className="text-sm whitespace-pre-wrap">{post.content}</p>
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
              onClick={() => setShowDetailDialog(true)}
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
            onViewAllComments={() => setShowDetailDialog(true)}
            onAddComment={(content: string) => onAddComment(post.id, content)}
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
        onAddComment={(content: string) => onAddComment(post.id, content)
        }
        onLike={() => handleLike()}
        isLiked={isLiked}
        likeCount={likeCount}
      />
    </>
  );
}
