// Mock data for Admin Dashboard

export interface MockUser {
  id: string;
  fullName: string;
  username: string;
  email: string;
  status: 'active' | 'banned';
  role: 'volunteer' | 'manager';
  profilePicture?: string;
  createdAt: string;
}

export interface MockEvent {
  id: string;
  name: string;
  detail: string;
  date: string;
  location: string;
  members: number;
  tags: string[];
  status: 'active' | 'completed' | 'pending';
  createdAt: string;
}

export interface MockReport {
  id: string;
  reporter: {
    id: string;
    username: string;
    name: string;
    email: string;
    profilePicture?: string;
  };
  targetType: 'post' | 'user';
  targetId: string;
  targetUsername?: string;
  reason: string;
  description?: string;
  status: 'pending' | 'resolved' | 'rejected';
  createdAt: string;
}

// Generate mock users
export const mockUsers: MockUser[] = [
  { id: '1', fullName: 'John Doe', username: 'johndoe', email: 'john.doe@email.com', status: 'active', role: 'volunteer', createdAt: '2024-01-15' },
  { id: '2', fullName: 'Jane Smith', username: 'janesmith', email: 'jane.smith@email.com', status: 'active', role: 'manager', createdAt: '2024-02-20' },
  { id: '3', fullName: 'Mike Johnson', username: 'mikej', email: 'mike.j@email.com', status: 'banned', role: 'volunteer', createdAt: '2024-03-10' },
  { id: '4', fullName: 'Emily Brown', username: 'emilybrown', email: 'emily.b@email.com', status: 'active', role: 'volunteer', createdAt: '2024-04-05' },
  { id: '5', fullName: 'David Wilson', username: 'davidw', email: 'david.w@email.com', status: 'active', role: 'manager', createdAt: '2024-05-12' },
  { id: '6', fullName: 'Sarah Davis', username: 'sarahd', email: 'sarah.d@email.com', status: 'active', role: 'volunteer', createdAt: '2024-06-18' },
  { id: '7', fullName: 'Chris Lee', username: 'chrislee', email: 'chris.lee@email.com', status: 'active', role: 'volunteer', createdAt: '2024-07-22' },
  { id: '8', fullName: 'Amanda Taylor', username: 'amandat', email: 'amanda.t@email.com', status: 'banned', role: 'volunteer', createdAt: '2024-08-30' },
  { id: '9', fullName: 'Robert Martinez', username: 'robertm', email: 'robert.m@email.com', status: 'active', role: 'manager', createdAt: '2024-09-05' },
  { id: '10', fullName: 'Lisa Anderson', username: 'lisaa', email: 'lisa.a@email.com', status: 'active', role: 'volunteer', createdAt: '2024-10-14' },
  { id: '11', fullName: 'Kevin Thomas', username: 'kevint', email: 'kevin.t@email.com', status: 'active', role: 'volunteer', createdAt: '2024-11-01' },
  { id: '12', fullName: 'Jessica White', username: 'jessicaw', email: 'jessica.w@email.com', status: 'active', role: 'manager', createdAt: '2024-11-20' },
  { id: '13', fullName: 'Daniel Harris', username: 'danielh', email: 'daniel.h@email.com', status: 'active', role: 'volunteer', createdAt: '2024-12-01' },
  { id: '14', fullName: 'Michelle Clark', username: 'michellec', email: 'michelle.c@email.com', status: 'banned', role: 'volunteer', createdAt: '2024-12-10' },
  { id: '15', fullName: 'James Lewis', username: 'jamesl', email: 'james.l@email.com', status: 'active', role: 'volunteer', createdAt: '2024-12-15' },
];

// Generate mock events
export const mockEvents: MockEvent[] = [
  { id: '1', name: 'Beach Cleanup Drive', detail: 'Join us for a beach cleanup event to protect marine life and keep our beaches beautiful.', date: '2025-01-15', location: 'Vung Tau Beach', members: 45, tags: ['environment', 'cleanup'], status: 'active', createdAt: '2024-12-01' },
  { id: '2', name: 'Tree Planting Festival', detail: 'Plant trees and contribute to a greener future in our community park.', date: '2025-01-20', location: 'Hanoi Central Park', members: 120, tags: ['environment', 'planting'], status: 'active', createdAt: '2024-12-05' },
  { id: '3', name: 'Charity Food Distribution', detail: 'Help distribute food packages to underprivileged families in the local area.', date: '2025-01-25', location: 'District 7 Community Center', members: 30, tags: ['charity', 'food'], status: 'pending', createdAt: '2024-12-10' },
  { id: '4', name: 'Digital Literacy Workshop', detail: 'Teach basic computer skills to elderly citizens in rural areas.', date: '2024-12-20', location: 'Ba Vi District', members: 25, tags: ['education', 'technology'], status: 'completed', createdAt: '2024-11-15' },
  { id: '5', name: 'Blood Donation Camp', detail: 'Organize a blood donation camp in partnership with local hospitals.', date: '2025-02-01', location: 'Cho Ray Hospital', members: 80, tags: ['health', 'donation'], status: 'pending', createdAt: '2024-12-12' },
  { id: '6', name: 'River Cleanup Campaign', detail: 'Clean up the Saigon River banks and raise awareness about water pollution.', date: '2024-11-30', location: 'Saigon River', members: 55, tags: ['environment', 'cleanup'], status: 'completed', createdAt: '2024-10-20' },
  { id: '7', name: 'Youth Mentorship Program', detail: 'Mentor underprivileged youth and help them with career guidance.', date: '2025-02-10', location: 'Youth Development Center', members: 18, tags: ['education', 'mentorship'], status: 'active', createdAt: '2024-12-08' },
  { id: '8', name: 'Elderly Care Visit', detail: 'Visit nursing homes and spend quality time with elderly residents.', date: '2025-01-28', location: 'Golden Age Nursing Home', members: 22, tags: ['charity', 'elderly'], status: 'pending', createdAt: '2024-12-14' },
  { id: '9', name: 'Recycling Awareness Drive', detail: 'Educate communities about proper recycling practices and sustainable living.', date: '2024-10-15', location: 'Various Schools', members: 90, tags: ['environment', 'education'], status: 'completed', createdAt: '2024-09-01' },
  { id: '10', name: 'Free Medical Checkup Camp', detail: 'Provide free health checkups to residents in underserved areas.', date: '2025-02-15', location: 'Rural Health Center', members: 35, tags: ['health', 'charity'], status: 'pending', createdAt: '2024-12-18' },
];

// Generate mock reports
export const mockReports: MockReport[] = [
  { id: '1', reporter: { id: 'u1', username: 'johndoe', name: 'John Doe', email: 'john@email.com' }, targetType: 'post', targetId: 'post-123', reason: 'Spam', description: 'This post contains promotional spam content.', status: 'pending', createdAt: '2024-12-18' },
  { id: '2', reporter: { id: 'u2', username: 'janesmith', name: 'Jane Smith', email: 'jane@email.com' }, targetType: 'user', targetId: 'u5', targetUsername: 'spammer99', reason: 'Harassment', description: 'This user has been sending harassing messages.', status: 'pending', createdAt: '2024-12-17' },
  { id: '3', reporter: { id: 'u3', username: 'mikej', name: 'Mike Johnson', email: 'mike@email.com' }, targetType: 'post', targetId: 'post-456', reason: 'Inappropriate Content', description: 'Post contains inappropriate images.', status: 'resolved', createdAt: '2024-12-15' },
  { id: '4', reporter: { id: 'u4', username: 'emilybrown', name: 'Emily Brown', email: 'emily@email.com' }, targetType: 'user', targetId: 'u8', targetUsername: 'fakeuser', reason: 'Fake Account', description: 'This account appears to be impersonating someone.', status: 'pending', createdAt: '2024-12-14' },
  { id: '5', reporter: { id: 'u5', username: 'davidw', name: 'David Wilson', email: 'david@email.com' }, targetType: 'post', targetId: 'post-789', reason: 'Misinformation', description: 'This post spreads false information.', status: 'rejected', createdAt: '2024-12-12' },
];

// Analytics data
export const analyticsData = {
  userGrowth: [
    { month: 'Jan', users: 120 },
    { month: 'Feb', users: 145 },
    { month: 'Mar', users: 178 },
    { month: 'Apr', users: 210 },
    { month: 'May', users: 256 },
    { month: 'Jun', users: 312 },
    { month: 'Jul', users: 380 },
    { month: 'Aug', users: 425 },
    { month: 'Sep', users: 489 },
    { month: 'Oct', users: 534 },
    { month: 'Nov', users: 598 },
    { month: 'Dec', users: 650 },
  ],
  eventsPerMonth: [
    { month: 'Jan', events: 8 },
    { month: 'Feb', events: 12 },
    { month: 'Mar', events: 15 },
    { month: 'Apr', events: 10 },
    { month: 'May', events: 18 },
    { month: 'Jun', events: 22 },
    { month: 'Jul', events: 25 },
    { month: 'Aug', events: 20 },
    { month: 'Sep', events: 28 },
    { month: 'Oct', events: 32 },
    { month: 'Nov', events: 30 },
    { month: 'Dec', events: 35 },
  ],
  eventsByStatus: [
    { name: 'Active', value: 45, color: 'hsl(var(--chart-1))' },
    { name: 'Completed', value: 120, color: 'hsl(var(--chart-2))' },
    { name: 'Pending', value: 25, color: 'hsl(var(--chart-3))' },
  ],
  volunteerParticipation: [
    { month: 'Jan', volunteers: 85 },
    { month: 'Feb', volunteers: 110 },
    { month: 'Mar', volunteers: 145 },
    { month: 'Apr', volunteers: 180 },
    { month: 'May', volunteers: 220 },
    { month: 'Jun', volunteers: 275 },
    { month: 'Jul', volunteers: 340 },
    { month: 'Aug', volunteers: 390 },
    { month: 'Sep', volunteers: 420 },
    { month: 'Oct', volunteers: 480 },
    { month: 'Nov', volunteers: 520 },
    { month: 'Dec', volunteers: 580 },
  ],
  topEventCategories: [
    { category: 'Environment', count: 45 },
    { category: 'Education', count: 38 },
    { category: 'Charity', count: 32 },
    { category: 'Health', count: 28 },
    { category: 'Community', count: 22 },
  ],
  reportsDistribution: [
    { type: 'Spam', count: 25 },
    { type: 'Harassment', count: 18 },
    { type: 'Inappropriate', count: 12 },
    { type: 'Fake Account', count: 8 },
    { type: 'Misinformation', count: 15 },
  ],
  statistics: {
    totalUsers: 650,
    totalEvents: 190,
    activeVolunteers: 520,
    completedEvents: 120,
    pendingReports: 15,
    totalHoursVolunteered: 12500,
  },
};
