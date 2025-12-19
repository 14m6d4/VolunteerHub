import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ManagerEventCard } from '@/components/event/manager-event-card';
import { CreateEditEventModal } from '@/components/event/create-edit-event-modal';
import { ManageMembersModal } from '@/components/event/manage-members-modal';
import type { Event, EventFilters, User } from '@/types/event';

// Mock Manager Events Data
const mockManagerEvents: Event[] = [
  {
    id: 'm1',
    title: 'Beach Cleanup Initiative',
    image: 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?w=800&h=400&fit=crop',
    date: 'Jan 15, 2026 - 8:00 AM',
    location: 'Santa Monica Beach, CA',
    membersCount: 45,
    isJoined: false,
    isPast: false,
    status: 'available',
    managerStatus: 'active',
    tags: ['Environment', 'Outdoor', 'Community'],
    description: 'Join us for a morning of environmental stewardship as we clean up Santa Monica Beach.',
    members: [
      { id: '1', name: 'John Doe', username: 'johndoe', email: 'john@example.com' },
      { id: '2', name: 'Jane Smith', username: 'janesmith', email: 'jane@example.com' },
      { id: '3', name: 'Bob Johnson', username: 'bobjohnson', email: 'bob@example.com' },
      { id: '4', name: 'Alice Williams', username: 'alicew', email: 'alice@example.com' },
      { id: '5', name: 'Charlie Brown', username: 'charlieb', email: 'charlie@example.com' },
      { id: '6', name: 'Diana Prince', username: 'dprince', email: 'diana@example.com' },
    ],
    requests: [
      { id: '7', name: 'Eve Davis', username: 'eved', email: 'eve@example.com' },
      { id: '8', name: 'Frank Miller', username: 'frankm', email: 'frank@example.com' },
    ],
  },
  {
    id: 'm2',
    title: 'Food Bank Distribution Center',
    image: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=800&h=400&fit=crop',
    date: 'Jan 22, 2026 - 9:00 AM',
    location: 'Downtown Community Center',
    membersCount: 32,
    isJoined: false,
    isPast: false,
    status: 'available',
    managerStatus: 'pending',
    tags: ['Food', 'Community', 'Social Services'],
    description: 'Help us sort and distribute food to families in need.',
    members: [],
    requests: [],
  },
  {
    id: 'm3',
    title: 'Senior Center Tech Workshop',
    image: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=800&h=400&fit=crop',
    date: 'Feb 5, 2026 - 2:00 PM',
    location: 'Riverside Senior Center',
    membersCount: 18,
    isJoined: false,
    isPast: false,
    status: 'available',
    managerStatus: 'active',
    tags: ['Education', 'Seniors', 'Technology'],
    description: 'Share your tech knowledge with seniors!',
    members: [
      { id: '9', name: 'Grace Lee', username: 'gracee', email: 'grace@example.com' },
      { id: '10', name: 'Henry Adams', username: 'henrya', email: 'henry@example.com' },
    ],
    requests: [
      { id: '11', name: 'Iris Chen', username: 'irisc', email: 'iris@example.com' },
    ],
  },
  {
    id: 'm4',
    title: 'Holiday Charity Drive',
    image: 'https://images.unsplash.com/photo-1607344645866-009c320b63e0?w=800&h=400&fit=crop',
    date: 'Dec 10, 2025 - 10:00 AM',
    location: 'City Hall Plaza',
    membersCount: 89,
    isJoined: false,
    isPast: true,
    status: 'available',
    managerStatus: 'completed',
    tags: ['Community', 'Food', 'Holiday'],
    description: 'Our annual holiday charity drive was a huge success!',
    members: [
      { id: '12', name: 'Jack Wilson', username: 'jackw', email: 'jack@example.com' },
    ],
    requests: [],
  },
];

export const ManagerEventDashboard = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>(mockManagerEvents);
  const [filters, setFilters] = useState<EventFilters>({
    searchQuery: '',
    sortBy: 'date',
    selectedTags: [],
  });

  // Modal states
  const [createEditModalOpen, setCreateEditModalOpen] = useState(false);
  const [manageMembersModalOpen, setManageMembersModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);

  // Get all unique tags from events
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    events.forEach(event => {
      event.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [events]);

  // Filter and sort events
  const processedEvents = useMemo(() => {
    let filtered = events.filter(event => {
      const matchesSearch = event.title.toLowerCase().includes(filters.searchQuery.toLowerCase());
      const matchesTags = filters.selectedTags.length === 0 || 
        filters.selectedTags.some(tag => event.tags.includes(tag));
      return matchesSearch && matchesTags;
    });

    filtered.sort((a, b) => {
      if (filters.sortBy === 'date') {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      } else {
        return b.membersCount - a.membersCount;
      }
    });

    return filtered;
  }, [events, filters]);

  const activeEvents = processedEvents.filter(event => event.managerStatus === 'active');
  const pendingEvents = processedEvents.filter(event => event.managerStatus === 'pending');
  const completedEvents = processedEvents.filter(event => event.managerStatus === 'completed');

  const handleCreateEvent = () => {
    setSelectedEvent(null);
    setCreateEditModalOpen(true);
  };

  const handleEditEvent = (event: Event) => {
    setSelectedEvent(event);
    setCreateEditModalOpen(true);
  };

  const handleSaveEvent = (eventData: Partial<Event>) => {
    if (selectedEvent) {
      // Edit existing event - reset to pending
      setEvents(prev => prev.map(e => 
        e.id === selectedEvent.id 
          ? { ...e, ...eventData, managerStatus: 'pending' as const }
          : e
      ));
      toast.success('Event Updated', {
        description: 'Event has been updated and reset to pending status for admin approval.',
      });
    } else {
      // Create new event
      const newEvent: Event = {
        id: `m${Date.now()}`,
        ...eventData as Omit<Event, 'id'>,
        membersCount: 0,
        isJoined: false,
        isPast: false,
        status: 'available',
        managerStatus: 'pending',
        members: [],
        requests: [],
      };
      setEvents(prev => [...prev, newEvent]);
      toast.success('Event Created', {
        description: 'Event has been created and is pending admin approval.',
      });
    }
  };

  const handleManageMembers = (event: Event) => {
    setSelectedEvent(event);
    setManageMembersModalOpen(true);
  };

  const handleRemoveMember = (userId: string) => {
    if (!selectedEvent) return;
    setEvents(prev => prev.map(e => 
      e.id === selectedEvent.id
        ? { 
            ...e, 
            members: e.members?.filter(m => m.id !== userId),
            membersCount: (e.members?.length || 1) - 1,
          }
        : e
    ));
    setSelectedEvent(prev => prev ? {
      ...prev,
      members: prev.members?.filter(m => m.id !== userId),
      membersCount: (prev.members?.length || 1) - 1,
    } : null);
    toast.success('Member Removed');
  };

  const handleApproveRequest = (userId: string) => {
    if (!selectedEvent) return;
    const user = selectedEvent.requests?.find(r => r.id === userId);
    if (!user) return;

    setEvents(prev => prev.map(e => 
      e.id === selectedEvent.id
        ? { 
            ...e, 
            requests: e.requests?.filter(r => r.id !== userId),
            members: [...(e.members || []), user],
            membersCount: (e.members?.length || 0) + 1,
          }
        : e
    ));
    setSelectedEvent(prev => prev ? {
      ...prev,
      requests: prev.requests?.filter(r => r.id !== userId),
      members: [...(prev.members || []), user],
      membersCount: (prev.members?.length || 0) + 1,
    } : null);
    toast.success('Request Approved');
  };

  const handleRejectRequest = (userId: string) => {
    if (!selectedEvent) return;
    setEvents(prev => prev.map(e => 
      e.id === selectedEvent.id
        ? { ...e, requests: e.requests?.filter(r => r.id !== userId) }
        : e
    ));
    setSelectedEvent(prev => prev ? {
      ...prev,
      requests: prev.requests?.filter(r => r.id !== userId),
    } : null);
    toast.success('Request Rejected');
  };

  const handleApproveAll = () => {
    if (!selectedEvent || !selectedEvent.requests?.length) return;
    
    setEvents(prev => prev.map(e => 
      e.id === selectedEvent.id
        ? { 
            ...e, 
            members: [...(e.members || []), ...(e.requests || [])],
            requests: [],
            membersCount: (e.members?.length || 0) + (e.requests?.length || 0),
          }
        : e
    ));
    setSelectedEvent(prev => prev ? {
      ...prev,
      members: [...(prev.members || []), ...(prev.requests || [])],
      requests: [],
      membersCount: (prev.members?.length || 0) + (prev.requests?.length || 0),
    } : null);
    toast.success('All Requests Approved');
  };

  const handleRejectAll = () => {
    if (!selectedEvent) return;
    setEvents(prev => prev.map(e => 
      e.id === selectedEvent.id
        ? { ...e, requests: [] }
        : e
    ));
    setSelectedEvent(prev => prev ? { ...prev, requests: [] } : null);
    toast.success('All Requests Rejected');
  };

  const handleMarkCompleted = (event: Event) => {
    setEvents(prev => prev.map(e => 
      e.id === event.id
        ? { ...e, managerStatus: 'completed' as const }
        : e
    ));
    toast.success('Event Marked as Completed');
  };

  const handleDeleteEvent = (event: Event) => {
    setEventToDelete(event);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (eventToDelete) {
      setEvents(prev => prev.filter(e => e.id !== eventToDelete.id));
      toast.success('Event Deleted');
      setEventToDelete(null);
    }
    setDeleteDialogOpen(false);
  };

  const handleCardClick = (event: Event) => {
    // Only navigate for active events
    if (event.managerStatus === 'active') {
      navigate(`/events/${event.id}`);
    }
  };

  const toggleTag = (tag: string) => {
    setFilters(prev => ({
      ...prev,
      selectedTags: prev.selectedTags.includes(tag)
        ? prev.selectedTags.filter(t => t !== tag)
        : [...prev.selectedTags, tag]
    }));
  };

  const clearTags = () => {
    setFilters(prev => ({ ...prev, selectedTags: [] }));
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Event Management</h1>
          <Button onClick={handleCreateEvent}>
            <Plus className="h-4 w-4 mr-2" />
            Create Event
          </Button>
        </div>
        
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search Bar */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search events..."
                className="pl-9"
                value={filters.searchQuery}
                onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
              />
            </div>

            {/* Tags Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full sm:w-[200px] justify-start">
                  <span className="truncate">
                    {filters.selectedTags.length === 0
                      ? 'Filter by Tags'
                      : `${filters.selectedTags.length} tag${filters.selectedTags.length > 1 ? 's' : ''} selected`}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-4" align="start">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm">Filter by Tags</h4>
                    {filters.selectedTags.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearTags}
                        className="h-auto p-1 text-xs"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {allTags.map(tag => (
                      <Badge
                        key={tag}
                        variant={filters.selectedTags.includes(tag) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => toggleTag(tag)}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Sort Dropdown */}
            <Select
              value={filters.sortBy}
              onValueChange={(value: 'date' | 'members') => 
                setFilters(prev => ({ ...prev, sortBy: value }))
              }
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Sort by Date</SelectItem>
                <SelectItem value="members">Sort by Members</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Selected Tags Display */}
          {filters.selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {filters.selectedTags.map(tag => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  {tag}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => toggleTag(tag)}
                  />
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabs Section */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-3 mb-6">
          <TabsTrigger value="active">Active Events ({activeEvents.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pendingEvents.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedEvents.length})</TabsTrigger>
        </TabsList>

        {/* Active Events Tab */}
        <TabsContent value="active" className="mt-6">
          {activeEvents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg">No active events found.</p>
              <p className="text-sm mt-2">Create a new event to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeEvents.map(event => (
                <ManagerEventCard
                  key={event.id}
                  event={event}
                  onClick={() => handleCardClick(event)}
                  onManageMembers={handleManageMembers}
                  onMarkCompleted={handleMarkCompleted}
                  onEdit={handleEditEvent}
                  onDelete={handleDeleteEvent}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Pending Events Tab */}
        <TabsContent value="pending" className="mt-6">
          {pendingEvents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg">No pending events.</p>
              <p className="text-sm mt-2">All events are approved.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingEvents.map(event => (
                <ManagerEventCard
                  key={event.id}
                  event={event}
                  onClick={() => {}} // No navigation for pending events
                  onManageMembers={handleManageMembers}
                  onMarkCompleted={handleMarkCompleted}
                  onEdit={handleEditEvent}
                  onDelete={handleDeleteEvent}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Completed Events Tab */}
        <TabsContent value="completed" className="mt-6">
          {completedEvents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg">No completed events.</p>
              <p className="text-sm mt-2">Mark active events as completed when they finish.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {completedEvents.map(event => (
                <ManagerEventCard
                  key={event.id}
                  event={event}
                  onClick={() => {}} // No navigation for completed events
                  onManageMembers={handleManageMembers}
                  onMarkCompleted={handleMarkCompleted}
                  onEdit={handleEditEvent}
                  onDelete={handleDeleteEvent}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <CreateEditEventModal
        event={selectedEvent}
        open={createEditModalOpen}
        onOpenChange={setCreateEditModalOpen}
        onSave={handleSaveEvent}
        availableTags={allTags}
      />

      <ManageMembersModal
        event={selectedEvent}
        open={manageMembersModalOpen}
        onOpenChange={setManageMembersModalOpen}
        onRemoveMember={handleRemoveMember}
        onApproveRequest={handleApproveRequest}
        onRejectRequest={handleRejectRequest}
        onApproveAll={handleApproveAll}
        onRejectAll={handleRejectAll}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{eventToDelete?.title}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
