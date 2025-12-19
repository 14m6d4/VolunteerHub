// frontend/src/data/discussion-mock.ts

import type { DiscussionUser, Post, Comment, DiscussionEvent } from '@/types/discussion';

// Mock Users
export const mockUsers: DiscussionUser[] = [
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
  {
    id: 'user-9',
    name: 'Lisa Anderson',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop',
    role: 'volunteer',
  },
  {
    id: 'user-10',
    name: 'Robert Martinez',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop',
    role: 'volunteer',
  },
];

// Helper to get user by ID
export const getUserById = (id: string): DiscussionUser | undefined => {
  return mockUsers.find((user) => user.id === id);
};

// Mock Comments
const createComments = (postId: string, count: number): Comment[] => {
  const comments: Comment[] = [];
  const commentContents = [
    'This is amazing! Thank you for sharing.',
    'Count me in for the next event!',
    'Great initiative! Looking forward to it.',
    'How can I help with this?',
    "I've been volunteering for 5 years and this is one of the best events!",
    'Can we get more details about the schedule?',
    'Wonderful experience last time!',
    'Is there parking available at the venue?',
    'Thanks for organizing this!',
    "I'll bring some friends along!",
  ];

  const now = new Date();
  for (let i = 0; i < count; i++) {
    comments.push({
      id: `${postId}-comment-${i + 1}`,
      userId: mockUsers[Math.floor(Math.random() * mockUsers.length)].id,
      content: commentContents[i % commentContents.length],
      timestamp: new Date(now.getTime() - Math.random() * 48 * 60 * 60 * 1000), // Random time within last 48 hours
    });
  }

  return comments.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};

// Mock Posts
export const mockPosts: Post[] = [
  {
    id: 'post-1',
    userId: 'user-1', // Manager
    content:
      "🎉 Exciting news everyone! We've just confirmed the venue for our upcoming beach cleanup event. The turnout has been incredible - we've already hit 80% of our volunteer target! Remember to bring sunscreen and reusable water bottles. Let's make this our biggest cleanup yet! 🌊🌍",
    imageUrl: 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?w=800&h=400&fit=crop',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    likes: 47,
    comments: createComments('post-1', 5),
  },
  {
    id: 'post-2',
    userId: 'user-2', // Volunteer
    content:
      'Just finished my first shift at the food bank today! The team was so welcoming and the work felt incredibly meaningful. If anyone is on the fence about volunteering, just do it! 💪',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
    likes: 32,
    comments: createComments('post-2', 3),
  },
  {
    id: 'post-3',
    userId: 'user-4', // Manager
    content:
      '📢 IMPORTANT ANNOUNCEMENT: The volunteer training session scheduled for Saturday has been moved to the community center on Oak Street. Same time (10 AM), new location. Please confirm your attendance in the comments!',
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
    likes: 28,
    comments: createComments('post-3', 8),
  },
  {
    id: 'post-4',
    userId: 'user-3', // Volunteer
    content:
      "Does anyone have experience with teaching computer skills to seniors? I'm looking for tips before the digital literacy workshop next week. Any advice would be appreciated! 💻👴👵",
    timestamp: new Date(Date.now() - 18 * 60 * 60 * 1000), // 18 hours ago
    likes: 15,
    comments: createComments('post-4', 6),
  },
  {
    id: 'post-5',
    userId: 'user-8', // Manager
    content:
      "🏆 Volunteer Spotlight: A huge shoutout to @Emily Rodriguez for completing 100 volunteer hours this month! Her dedication to our community garden project has been truly inspiring. Thank you, Emily, for making such a difference!",
    imageUrl: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&h=400&fit=crop',
    timestamp: new Date(Date.now() - 26 * 60 * 60 * 1000), // 26 hours ago
    likes: 89,
    comments: createComments('post-5', 12),
  },
  {
    id: 'post-6',
    userId: 'user-5', // Volunteer
    content:
      "Carpooling from downtown to the event on Saturday! I have 3 spots available. DM me if you need a ride. Let's reduce our carbon footprint together! 🚗🌱",
    timestamp: new Date(Date.now() - 30 * 60 * 60 * 1000), // 30 hours ago
    likes: 21,
    comments: createComments('post-6', 4),
  },
  {
    id: 'post-7',
    userId: 'user-1', // Manager
    content:
      "📊 Monthly Impact Report: Together, we've contributed over 500 volunteer hours, served 2,000+ meals, and planted 150 trees this month. YOU made this possible! Check out the full report in the attached document.",
    imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=400&fit=crop',
    timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000), // 48 hours ago
    likes: 156,
    comments: createComments('post-7', 15),
  },
  {
    id: 'post-8',
    userId: 'user-6', // Volunteer
    content:
      'Quick question: What should I wear to the construction site volunteering tomorrow? First time doing this type of work! 🔨',
    timestamp: new Date(Date.now() - 52 * 60 * 60 * 1000), // 52 hours ago
    likes: 8,
    comments: createComments('post-8', 7),
  },
  {
    id: 'post-9',
    userId: 'user-4', // Manager
    content:
      "🎓 FREE Training Opportunity: We're offering a First Aid & CPR certification course for all active volunteers. Limited spots available - register through the link in bio. This Saturday, 9 AM - 2 PM.",
    timestamp: new Date(Date.now() - 72 * 60 * 60 * 1000), // 72 hours ago
    likes: 67,
    comments: createComments('post-9', 9),
  },
  {
    id: 'post-10',
    userId: 'user-7', // Volunteer
    content:
      "Made some new friends at today's event! Love how volunteering brings people from all walks of life together. Here's to many more memories! 🤝❤️",
    imageUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&h=400&fit=crop',
    timestamp: new Date(Date.now() - 96 * 60 * 60 * 1000), // 96 hours ago
    likes: 43,
    comments: createComments('post-10', 2),
  },
];

// Mock Event
export const mockEvent: DiscussionEvent = {
  id: 'event-1',
  title: 'Community Beach Cleanup 2024',
  bannerImage: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=1200&h=400&fit=crop',
  location: 'Sunny Beach, 123 Coastal Highway, Oceanside',
  date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Created 30 days ago
  membersCount: 1247,
  description: `Join us for our annual Community Beach Cleanup event! This year, we're aiming to make an even bigger impact on our local coastline.

**What to expect:**
- A morning of meaningful work alongside fellow volunteers
- All equipment provided (gloves, bags, grabbers)
- Light refreshments and snacks
- Certificate of participation
- Fun team activities and beach games after cleanup

**Schedule:**
- 8:00 AM - Registration & Welcome
- 8:30 AM - Safety Briefing
- 9:00 AM - Cleanup Begins
- 12:00 PM - Lunch Break (provided)
- 1:00 PM - Beach Games & Networking
- 3:00 PM - Closing Ceremony

**What to bring:**
- Comfortable clothes you don't mind getting dirty
- Sunscreen and hat
- Reusable water bottle
- Positive attitude!

Whether you're a first-time volunteer or a seasoned environmental warrior, everyone is welcome. Let's protect our oceans together! 🌊🐢`,
  tags: ['Environment', 'Beach Cleanup', 'Community', 'Outdoors', 'Family Friendly'],
  members: mockUsers,
};

// Current user (simulating logged in user)
export const currentUser: DiscussionUser = mockUsers[2]; // Emily Rodriguez
