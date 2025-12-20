import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EventCard } from '@/components/event/event-card';
import { EventDetailModal } from '@/components/event/event-detail';
import type { Event, EventFilters } from '@/types/event';
import { getEvents, getMyRegistrations, unregisterEvent, registerEvent } from '@/services/event.service';

export const EventsList = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<EventFilters>({
    searchQuery: '',
    sortBy: 'date',
    selectedTags: [],
  });
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch all approved and finished events and user's registrations in parallel
      const [eventsResponse, registrationsResponse] = await Promise.all([
        getEvents({ status: 'approved,finished' }),
        getMyRegistrations()
      ]);

      const backendEvents = eventsResponse.items || [];
      const registrations = registrationsResponse.data || registrationsResponse.items || [];

      // Map registrations to a Map for O(1) lookup with status
      const registrationMap = new Map(registrations.map((r: any) => {
        const eventId = typeof r.eventId === 'string' ? r.eventId : r.eventId?._id || r.eventId?.id;
        return [eventId, r.status]; // status should be 'pending', 'approved', 'completed', etc.
      }));

      const mappedEvents: Event[] = backendEvents.map((be: any) => {
        const eventId = be._id || be.id;
        const registrationStatus = registrationMap.get(eventId);

        // Treat both pending, approved and completed as "joined"
        // But distinguish them via the status field
        const isApproved = registrationStatus === 'approved';
        const isPending = registrationStatus === 'pending';
        const isCompleted = registrationStatus === 'completed';
        const isJoined = isApproved || isPending || isCompleted;

        const eventDate = new Date(be.startAt || be.date);
        // Event is past if date is past OR status is finished OR user completed it
        const isPast = eventDate < new Date() || be.status === 'finished' || isCompleted;

        let status: Event['status'] = 'available';
        if (isPending) status = 'pending';
        else if (isApproved) status = 'joined';
        else if (isPast) status = 'past';

        return {
          id: eventId,
          title: be.title,
          image: be.image || 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=400&fit=crop', // Fallback image
          date: new Date(be.startAt || be.date).toLocaleString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true
          }),
          location: be.location || 'TBD',
          membersCount: be.currentMembers || be.membersCount || 0,
          isJoined,
          isPast,
          status,
          tags: be.tags || [],
          description: be.description || '',
        };
      });

      setEvents(mappedEvents);
    } catch (error) {
      console.error('Failed to fetch events:', error);
      toast.error('Failed to load events. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

    // Sort events
    filtered.sort((a, b) => {
      if (filters.sortBy === 'date') {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      } else {
        return b.membersCount - a.membersCount;
      }
    });

    return filtered;
  }, [events, filters]);

  const myEvents = processedEvents.filter(event => event.isJoined && !event.isPast);
  const discoverEvents = processedEvents.filter(event => !event.isJoined && !event.isPast);
  const pastEvents = processedEvents.filter(event => event.isJoined && event.isPast);

  const handleMyEventClick = (event: Event) => {
    if (event.status === 'pending') {
      toast.error('Discussion Access Denied', {
        description: 'You cannot access the discussion until your registration is approved.',
      });
      return;
    }
    navigate(`/events/${event.id}`);
  };

  const handleDiscoverEventClick = (event: Event) => {
    setSelectedEvent(event);
    setModalOpen(true);
  };

  const handleLeaveEvent = async (event: Event) => {
    try {
      await unregisterEvent(event.id);
      toast.success('Left Event', {
        description: `You have left "${event.title}".`,
      });
      fetchData(); // Refresh list to update status
    } catch (error) {
      console.error('Failed to leave event:', error);
      toast.error('Failed to leave event.');
    }
  };

  const handleJoinEvent = async (event: Event) => {
    try {
      await registerEvent(event.id);
      toast.success('Request Sent', {
        description: `Your request to join "${event.title}" has been sent for approval.`,
      });
      setModalOpen(false);
      fetchData(); // Refresh list to update status
    } catch (error) {
      console.error('Failed to join event:', error);
      toast.error('Failed to join event.');
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

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse">Loading events...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-6">Volunteer Events</h1>

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
      <Tabs defaultValue="my-events" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-3 mb-6">
          <TabsTrigger value="my-events">My Events ({myEvents.length})</TabsTrigger>
          <TabsTrigger value="discover">Discover ({discoverEvents.length})</TabsTrigger>
          <TabsTrigger value="past-events">Past Events ({pastEvents.length})</TabsTrigger>
        </TabsList>

        {/* My Events Tab */}
        <TabsContent value="my-events" className="mt-6">
          {myEvents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg">No events found.</p>
              <p className="text-sm mt-2">Try adjusting your search or explore new events in the Discover tab.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myEvents.map(event => (
                <EventCard
                  key={event.id}
                  event={event}
                  onClick={() => handleMyEventClick(event)}
                  onLeave={handleLeaveEvent}
                  showLeaveButton={true}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Discover Tab */}
        <TabsContent value="discover" className="mt-6">
          {discoverEvents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg">No events found.</p>
              <p className="text-sm mt-2">Try adjusting your search criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {discoverEvents.map(event => (
                <EventCard
                  key={event.id}
                  event={event}
                  onClick={() => handleDiscoverEventClick(event)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Past Events Tab */}
        <TabsContent value="past-events" className="mt-6">
          {pastEvents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg">No past events found.</p>
              <p className="text-sm mt-2">You haven't participated in any events yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pastEvents.map(event => (
                <EventCard
                  key={event.id}
                  event={event}
                  onClick={() => handleMyEventClick(event)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Event Detail Modal */}
      <EventDetailModal
        event={selectedEvent}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onApply={handleJoinEvent}
      />
    </div>
  );
};
