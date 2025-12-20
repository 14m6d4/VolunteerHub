export type EventStatus = 'joined' | 'past' | 'pending' | 'available';
export type ManagerEventStatus = 'active' | 'pending' | 'completed';

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
  location: string;
  membersCount: number;
  isJoined: boolean;
  isPast: boolean;
  status: EventStatus;
  tags: string[];
  description: string;
  // Manager-specific fields
  managerStatus?: ManagerEventStatus;
  requests?: User[];
  members?: User[];
  managerId?: string | { _id: string; name: string; email: string };
}

export interface EventFilters {
  searchQuery: string;
  sortBy: 'date' | 'members';
  selectedTags: string[];
}
