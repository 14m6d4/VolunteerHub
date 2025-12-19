// frontend/src/types/discussion.ts

export type DiscussionUserRole = 'volunteer' | 'manager';

export interface DiscussionUser {
  id: string;
  name: string;
  avatarUrl: string;
  role: DiscussionUserRole;
}

export interface Comment {
  id: string;
  userId: string;
  content: string;
  timestamp: Date;
}

export interface Post {
  id: string;
  userId: string;
  content: string;
  imageUrl?: string;
  timestamp: Date;
  likes: number;
  comments: Comment[];
}

export interface DiscussionEvent {
  id: string;
  title: string;
  bannerImage: string;
  location: string;
  date: Date;
  createdAt: Date;
  membersCount: number;
  description: string;
  tags: string[];
  members: DiscussionUser[];
}

// Helper type to combine post with user data
export interface PostWithUser extends Post {
  author: DiscussionUser;
}

export interface CommentWithUser extends Comment {
  author: DiscussionUser;
}
