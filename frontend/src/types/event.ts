export type EventStatus = 'draft' | 'pending' | 'approved' | 'cancelled' | 'finished';

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
}

export interface Event {
  id: string;
  title: string;
  image: string;
  date: string;
  startAt: string;
  location: string;
  membersCount: number;
  isJoined: boolean;
  isPast: boolean;
  status: EventStatus;
  tags: string[];
  description: string;
  requests?: User[];
  members?: User[];
  managerId?: string | { _id: string; name: string; email: string };
  pendingReportsCount?: number;
}

export interface EventFilters {
  searchQuery: string;
  sortBy: 'date' | 'members';
  selectedTags: string[];
}
