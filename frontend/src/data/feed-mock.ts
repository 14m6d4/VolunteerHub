

import type { DiscussionUser, Post, Comment } from '@/types/discussion';
import type { Event as EventType } from '@/types/event';

// Extended types for Feed
export interface FeedEvent {
  id: string;
  title: string;
  image: string;
  date: string;
  location: string;
  membersCount: number;
  description: string;
  tags: string[];
  isJoined: boolean;
  isTrending?: boolean;
  trendingReason?: string;
}

export interface FeedPost extends Post {
  eventId: string;
  eventTitle: string;
  eventImage: string;
}

export interface FeedPostWithUser extends FeedPost {
  author: DiscussionUser;
}

export interface FriendSuggestion {
  id: string;
  name: string;
  username: string;
  avatarUrl: string;
  mutualFriends?: number;
}

// Mock Users (reuse from discussion-mock but extend)
export const feedUsers: DiscussionUser[] = [
  {
    id: 'user-1',
    name: 'Sarah Johnson',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    role: 'manager',
  },
  {
    id: 'user-2',
    name: 'Michael Chen',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    role: 'volunteer',
  },
  {
    id: 'user-3',
    name: 'Emily Rodriguez',
    avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
    role: 'volunteer',
  },
  {
    id: 'user-4',
    name: 'David Kim',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
    role: 'manager',
  },
  {
    id: 'user-5',
    name: 'Jessica Williams',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
    role: 'volunteer',
  },
  {
    id: 'user-6',
    name: 'Alex Thompson',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
    role: 'volunteer',
  },
  {
    id: 'user-7',
    name: 'Maria Garcia',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop',
    role: 'volunteer',
  },
  {
    id: 'user-8',
    name: 'James Wilson',
    avatarUrl: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=100&h=100&fit=crop',
    role: 'manager',
  },
];

// Events user has joined (for left sidebar shortcuts)
export const joinedEvents: FeedEvent[] = [
  {
    id: 'event-1',
    title: 'Community Beach Cleanup 2024',
    image: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=400&h=300&fit=crop',
    date: 'Dec 27, 2024',
    location: 'Sunny Beach, Oceanside',
    membersCount: 1247,
    description: 'Join us for our annual beach cleanup event!',
    tags: ['Environment', 'Beach', 'Community'],
    isJoined: true,
  },
  {
    id: 'event-2',
    title: 'Food Bank Distribution Drive',
    image: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=400&h=300&fit=crop',
    date: 'Dec 28, 2024',
    location: 'Downtown Community Center',
    membersCount: 856,
    description: 'Help distribute food to families in need.',
    tags: ['Charity', 'Food', 'Community'],
    isJoined: true,
  },
  {
    id: 'event-3',
    title: 'Tree Planting Initiative',
    image: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=400&h=300&fit=crop',
    date: 'Jan 5, 2025',
    location: 'City Park Reserve',
    membersCount: 432,
    description: 'Plant trees and create a greener future.',
    tags: ['Environment', 'Nature', 'Outdoors'],
    isJoined: true,
  },
  {
    id: 'event-4',
    title: 'Senior Citizens Digital Literacy',
    image: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&h=300&fit=crop',
    date: 'Jan 10, 2025',
    location: 'Public Library Hall',
    membersCount: 156,
    description: 'Teach seniors basic computer and smartphone skills.',
    tags: ['Education', 'Technology', 'Seniors'],
    isJoined: true,
  },
];

// Trending events user has NOT joined (for suggestions)
export const trendingEvents: FeedEvent[] = [
  {
    id: 'event-5',
    title: 'Mountain Trail Restoration',
    image: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=400&h=300&fit=crop',
    date: 'Jan 15, 2025',
    location: 'Blue Ridge Mountains',
    membersCount: 523,
    description: 'Help restore and maintain hiking trails in our beautiful mountains. All skill levels welcome!',
    tags: ['Outdoors', 'Environment', 'Hiking'],
    isJoined: false,
    isTrending: true,
    trendingReason: '120 new members this week',
  },
  {
    id: 'event-6',
    title: 'Homeless Shelter Meal Service',
    image: 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=400&h=300&fit=crop',
    date: 'Dec 25, 2024',
    location: 'Hope Shelter, Main Street',
    membersCount: 892,
    description: 'Prepare and serve warm meals to those experiencing homelessness during the holiday season.',
    tags: ['Charity', 'Food', 'Homeless'],
    isJoined: false,
    isTrending: true,
    trendingReason: '45 new posts today',
  },
  {
    id: 'event-7',
    title: 'Animal Shelter Volunteer Day',
    image: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400&h=300&fit=crop',
    date: 'Jan 8, 2025',
    location: 'Happy Paws Shelter',
    membersCount: 678,
    description: 'Spend time with shelter animals, help with grooming, and assist with adoption events.',
    tags: ['Animals', 'Community', 'Care'],
    isJoined: false,
    isTrending: true,
    trendingReason: 'Most liked event this month',
  },
];

// Helper to generate comments
const createFeedComments = (postId: string, count: number): Comment[] => {
  const comments: Comment[] = [];
  const contents = [
    'This is amazing! Thank you for organizing.',
    'Count me in for the next session!',
    'Great work everyone! 🎉',
    'How can I help with this?',
    'Best volunteering experience ever!',
    'Looking forward to it!',
    'Thanks for the update!',
  ];

  const now = new Date();
  for (let i = 0; i < count; i++) {
    comments.push({
      id: `${postId}-comment-${i + 1}`,
      userId: feedUsers[Math.floor(Math.random() * feedUsers.length)].id,
      content: contents[i % contents.length],
      timestamp: new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000),
    });
  }
  return comments;
};

// Feed posts from joined events
export const feedPosts: FeedPost[] = [
  {
    id: 'feed-post-1',
    userId: 'user-1',
    eventId: 'event-1',
    eventTitle: 'Community Beach Cleanup 2024',
    eventImage: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=100&h=100&fit=crop',
    content: '🎉 Exciting news everyone! We\'ve just confirmed the venue for our upcoming beach cleanup event. The turnout has been incredible - we\'ve already hit 80% of our volunteer target! Remember to bring sunscreen and reusable water bottles. Let\'s make this our biggest cleanup yet! 🌊🌍',
    imageUrl: 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?w=800&h=400&fit=crop',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    likes: 47,
    comments: createFeedComments('feed-post-1', 5),
  },
  {
    id: 'feed-post-2',
    userId: 'user-2',
    eventId: 'event-2',
    eventTitle: 'Food Bank Distribution Drive',
    eventImage: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=100&h=100&fit=crop',
    content: 'Just finished my first shift at the food bank today! The team was so welcoming and the work felt incredibly meaningful. If anyone is on the fence about volunteering, just do it! 💪',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
    likes: 32,
    comments: createFeedComments('feed-post-2', 3),
  },
  {
    id: 'feed-post-3',
    userId: 'user-4',
    eventId: 'event-1',
    eventTitle: 'Community Beach Cleanup 2024',
    eventImage: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=100&h=100&fit=crop',
    content: '📢 IMPORTANT ANNOUNCEMENT: The volunteer training session scheduled for Saturday has been moved to the community center on Oak Street. Same time (10 AM), new location. Please confirm your attendance in the comments!',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
    likes: 28,
    comments: createFeedComments('feed-post-3', 8),
  },
  {
    id: 'feed-post-4',
    userId: 'user-3',
    eventId: 'event-3',
    eventTitle: 'Tree Planting Initiative',
    eventImage: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=100&h=100&fit=crop',
    content: 'Planted 50 trees today with an amazing group of volunteers! 🌳 The weather was perfect and we made great progress. Can\'t wait for the next session!',
    imageUrl: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&h=400&fit=crop',
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000),
    likes: 56,
    comments: createFeedComments('feed-post-4', 4),
  },
  {
    id: 'feed-post-5',
    userId: 'user-8',
    eventId: 'event-4',
    eventTitle: 'Senior Citizens Digital Literacy',
    eventImage: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=100&h=100&fit=crop',
    content: '🏆 Volunteer Spotlight: A huge shoutout to @Emily Rodriguez for helping Mrs. Thompson set up her first video call with her grandchildren! These moments make all the difference. Thank you, Emily!',
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
    likes: 89,
    comments: createFeedComments('feed-post-5', 12),
  },
  {
    id: 'feed-post-6',
    userId: 'user-5',
    eventId: 'event-2',
    eventTitle: 'Food Bank Distribution Drive',
    eventImage: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=100&h=100&fit=crop',
    content: 'Carpooling from downtown to the food bank on Saturday! I have 3 spots available. DM me if you need a ride. Let\'s reduce our carbon footprint together! 🚗🌱',
    timestamp: new Date(Date.now() - 18 * 60 * 60 * 1000),
    likes: 21,
    comments: createFeedComments('feed-post-6', 4),
  },
  {
    id: 'feed-post-7',
    userId: 'user-1',
    eventId: 'event-3',
    eventTitle: 'Tree Planting Initiative',
    eventImage: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=100&h=100&fit=crop',
    content: '📊 Monthly Impact Report: Together, we\'ve planted over 500 trees, restored 2 acres of parkland, and engaged 150+ volunteers this month. YOU made this possible! Check out the full report in the attached document.',
    imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=400&fit=crop',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    likes: 156,
    comments: createFeedComments('feed-post-7', 15),
  },
  {
    id: 'feed-post-8',
    userId: 'user-6',
    eventId: 'event-4',
    eventTitle: 'Senior Citizens Digital Literacy',
    eventImage: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=100&h=100&fit=crop',
    content: 'Quick question: What apps do you recommend teaching first to seniors? I\'ve been focusing on WhatsApp but wondering if there are better options. 📱',
    timestamp: new Date(Date.now() - 30 * 60 * 60 * 1000),
    likes: 8,
    comments: createFeedComments('feed-post-8', 7),
  },
];

// Friend suggestions
export const friendSuggestions: FriendSuggestion[] = [
  {
    id: 'suggest-1',
    name: 'Amanda Foster',
    username: 'amandaf',
    avatarUrl: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=100&h=100&fit=crop',
    mutualFriends: 5,
  },
  {
    id: 'suggest-2',
    name: 'Kevin Park',
    username: 'kevinpark',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
    mutualFriends: 3,
  },
  {
    id: 'suggest-3',
    name: 'Rachel Green',
    username: 'rachelg',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
    mutualFriends: 8,
  },
  {
    id: 'suggest-4',
    name: 'Daniel Lee',
    username: 'daniellee',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    mutualFriends: 2,
  },
  {
    id: 'suggest-5',
    name: 'Sophie Turner',
    username: 'sophiet',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop',
    mutualFriends: 6,
  },
];

// Helper to get user by ID
export const getFeedUserById = (id: string): DiscussionUser | undefined => {
  return feedUsers.find((user) => user.id === id);
};

// Get posts with user data
export const getFeedPostsWithUsers = (): FeedPostWithUser[] => {
  return feedPosts
    .map((post) => {
      const author = getFeedUserById(post.userId);
      if (!author) return null;
      return { ...post, author };
    })
    .filter((post): post is FeedPostWithUser => post !== null)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

// Current user
export const currentFeedUser: DiscussionUser = feedUsers[2]; // Emily Rodriguez

// Convert FeedEvent to Event type for EventDetailModal compatibility
export const toEventType = (feedEvent: FeedEvent): EventType => ({
  id: feedEvent.id,
  title: feedEvent.title,
  image: feedEvent.image,
  date: feedEvent.date,
  location: feedEvent.location,
  membersCount: feedEvent.membersCount,
  description: feedEvent.description,
  tags: feedEvent.tags,
  isJoined: feedEvent.isJoined,
  isPast: false,
  status: feedEvent.isJoined ? 'joined' : 'available',
});
