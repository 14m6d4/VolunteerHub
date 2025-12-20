import { DiscussionUser, CommentWithUser } from './discussion';

export interface FeedPostWithUser {
    id: string;
    userId: string;
    content: string;
    imageUrl?: string;
    timestamp: Date;
    likes: number;
    likedByMe?: boolean;
    eventId: string;
    eventTitle: string;
    eventImage: string;
    author: DiscussionUser;
    comments: CommentWithUser[];
    commentCount: number;
}

export interface TrendingEvent {
    id: string;
    title: string;
    image: string;
    date: string;
    location: string;
    membersCount: number;
    tags: string[];
    description: string;
    isTrending?: boolean;
    trendingReason?: string;
    isJoined?: boolean;
}

export interface FriendSuggestion {
    id: string;
    name: string;
    username: string;
    avatarUrl: string; // or avatar
    mutualFriends?: number;
}

export interface EventShortcut {
    id: string;
    title: string;
    image: string;
}
