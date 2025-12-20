// frontend/src/components/feed/feed-post-card.tsx

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Heart, MessageCircle, Flag } from 'lucide-react';
import type { CommentWithUser } from '@/types/discussion';
import type { FeedPostWithUser } from '@/types/feed';
import { CommentSection } from '@/components/discussion/comment-section';
import { ReportDialog } from '@/components/discussion/report-dialog';
import { PostDetailDialog } from '@/components/discussion/post-detail-dialog';
import { formatRelativeTime } from '@/utils/formatDate';

interface FeedPostCardProps {
  post: FeedPostWithUser;
  comments: CommentWithUser[];
  currentUserId: string;
  currentUser: { id: string; name: string; avatarUrl: string };
  onLike: (postId: string) => void;
  onAddComment: (postId: string, content: string) => void;
}

export function FeedPostCard({
  post,
  comments,
  currentUserId,
  currentUser,
  onLike,
  onAddComment,
}: FeedPostCardProps) {
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  const handleLike = () => {
    onLike(post.id);
  };
  // ...


  const isLiked = post.likedByMe || false;
  const likeCount = post.likes;

  const previewComments = comments.slice(0, 2);
  const hasMoreComments = comments.length > 2;

  // Convert FeedPostWithUser to PostWithUser for dialogs
  const postForDialog = {
    ...post,
    author: post.author,
  };

  return (
    <>
      <Card className="w-full shadow-md hover:shadow-lg transition-shadow">
        {/* Feed Header - Event Info + User Info */}
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              {/* Event Image (rounded square) */}
              <Link to={`/events/${post.eventId}`} className="shrink-0">
                <div className="h-12 w-12 rounded-lg overflow-hidden hover:opacity-80 transition-opacity">
                  <img
                    src={post.eventImage}
                    alt={post.eventTitle}
                    className="w-full h-full object-cover"
                  />
                </div>
              </Link>

              <div className="flex-1 min-w-0">
                {/* Event Name */}
                <Link
                  to={`/events/${post.eventId}`}
                  className="font-semibold text-sm hover:underline line-clamp-1"
                >
                  {post.eventTitle}
                </Link>

                {/* User Name + Time */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5 flex-wrap">
                  <Link
                    to={`/u/${post.author.name.toLowerCase().replace(/\s+/g, '')}`}
                    className="hover:underline hover:text-foreground transition-colors"
                  >
                    {post.author.name}
                  </Link>
                  {post.author.role === 'manager' && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                      Manager
                    </Badge>
                  )}
                  <span>•</span>
                  <span>{formatRelativeTime(post.timestamp)}</span>
                </div>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
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
      </Card>

      {/* Report Dialog */}
      <ReportDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        postId={post.id}
        reporterId={currentUserId}
      />

      {/* Post Detail Dialog */}
      <PostDetailDialog
        open={showDetailDialog}
        onOpenChange={setShowDetailDialog}
        post={postForDialog}
        comments={comments}
        currentUserId={currentUserId}
        currentUser={currentUser}
        onAddComment={(content: string) => onAddComment(post.id, content)}
        onLike={() => handleLike()}
        isLiked={isLiked}
        likeCount={likeCount}
      />
    </>
  );
}
