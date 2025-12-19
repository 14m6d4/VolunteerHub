export type EventStatus = 'joined' | 'past' | 'pending' | 'available';

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
}

export interface EventFilters {
  searchQuery: string;
  sortBy: 'date' | 'members';
  selectedTags: string[];
}
