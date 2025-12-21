import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { formatEventDate } from '@/utils/formatDate';
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
import {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventRegistrations,
  approveRegistration,
  rejectRegistration,
  kickMember,
  completeEvent,
} from '@/services/event.service';



export const ManagerEventDashboard = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
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

  // Registration mapping for selected event
  // Maps userId -> registrationId for actions
  const [registrationMap, setRegistrationMap] = useState<Record<string, string>>({});

  const fetchEvents = async () => {
    try {
      setLoading(true);
      // Fetch all events for the manager
      // Assuming getEvents returns events specific to the user or we filter them
      // For now, fetching all events and assuming backend filters or we filter client side if needed
      // Ideally backend endpoint /events?manager=me or similar
      const response = await getEvents();
      const fetchedEvents = (response.items || []).map((event: any) => ({
        ...event,
        date: formatEventDate(event.startAt),
        membersCount: event.currentMembers || 0
      }));

      // In a real app we might only show events created by this manager
      // fetching events
      setEvents(fetchedEvents);
    } catch (error) {
      console.error("Failed to fetch events:", error);
      toast.error("Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Get all unique tags from events
  const allTags = useMemo(() => {
    const predefinedTags = [
      "Education", "Environment", "Health", "Community", "Technology",
      "Arts & Culture", "Sports", "Crisis Relief", "Animal Welfare",
      "Senior Care", "Child Care", "Food Security", "Housing",
      "Human Rights", "Mentorship"
    ];
    const tags = new Set<string>(predefinedTags);
    events.forEach(event => {
      (event.tags || []).forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [events]);

  // Filter and sort events
  const processedEvents = useMemo(() => {
    let filtered = events.filter(event => {
      const matchesSearch = event.title.toLowerCase().includes(filters.searchQuery.toLowerCase());
      const matchesTags = filters.selectedTags.length === 0 ||
        (event.tags || []).some(tag => filters.selectedTags.includes(tag));
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

  // Categorize events
  const approvedEvents = processedEvents.filter(event => event.status === 'approved');
  const pendingEvents = processedEvents.filter(event => event.status === 'pending');
  const finishedEvents = processedEvents.filter(event => event.status === 'finished');
  const cancelledEvents = processedEvents.filter(event => event.status === 'cancelled');

  const handleCreateEvent = () => {
    setSelectedEvent(null);
    setCreateEditModalOpen(true);
  };

  const handleEditEvent = (event: Event) => {
    setSelectedEvent(event);
    setCreateEditModalOpen(true);
  };

  const handleSaveEvent = async (eventData: Partial<Event> & { imageFile?: File }) => {
    try {
      let dataToSend: any = eventData;
      const isMultipart = !!eventData.imageFile;

      if (isMultipart) {
        const formData = new FormData();
        // Append all fields to FormData
        Object.keys(eventData).forEach(key => {
          if (key === 'imageFile') {
            formData.append('image', eventData.imageFile!);
          } else if (key === 'tags') {
            // Handle array for tags
            const tags = eventData.tags || [];
            tags.forEach(tag => formData.append('tags', tag));
          } else if (key === 'image' || key === 'date') {
            // Skip the preview URL image string and the legacy formatted date string
          } else {
            const value = (eventData as any)[key];
            if (value !== undefined && value !== null) {
              formData.append(key, value.toString());
            }
          }
        });
        dataToSend = formData;
      } else {
        // If not multipart, we still verify we don't send 'date' if backend strict mode complains
        const { date, ...rest } = eventData as any;
        dataToSend = rest;
      }

      if (selectedEvent) {
        // Edit existing event
        await updateEvent(selectedEvent.id, dataToSend);
        toast.success('Event Updated', {
          description: 'Event has been updated successfully.',
        });
      } else {
        // Create new event
        await createEvent(dataToSend);
        toast.success('Event Created', {
          description: 'Event has been created successfully.',
        });
      }
      setCreateEditModalOpen(false);
      fetchEvents(); // Refresh list
    } catch (error) {
      console.error("Failed to save event:", error);
      toast.error("Failed to save event");
    }
  };

  const handleManageMembers = async (event: Event) => {
    setSelectedEvent(event);
    setManageMembersModalOpen(true); // Open modal immediately

    try {
      // Fetch registrations for this event to populate members/requests
      const registrationsData = await getEventRegistrations(event.id);
      const registrations = registrationsData.data || registrationsData || [];

      const newRegistrationMap: Record<string, string> = {};
      const members: User[] = [];
      const requests: User[] = [];

      registrations.forEach((reg: any) => {
        if (reg.volunteerId) {
          newRegistrationMap[reg.volunteerId._id || reg.volunteerId.id] = reg._id || reg.id;
          const user: User = {
            id: reg.volunteerId._id || reg.volunteerId.id,
            name: reg.volunteerId.name,
            username: reg.volunteerId.name, // Fallback if no username
            email: reg.volunteerId.email
          };

          if (reg.status === 'approved') {
            members.push(user);
          } else if (reg.status === 'pending') {
            requests.push(user);
          }
        }
      });

      setRegistrationMap(newRegistrationMap);

      // Update selected event with fetched members for the modal to display
      setSelectedEvent(prev => prev ? {
        ...prev,
        members,
        requests
      } : null);

    } catch (error) {
      console.error("Failed to fetch members:", error);
      toast.error("Failed to load members, showing local data if available");
    }
  };

  const handleRemoveMember = async (userId: string) => {
    const regId = registrationMap[userId];
    if (!regId) return;
    try {
      await kickMember(regId);
      toast.success('Member Removed');

      // Update local state
      if (selectedEvent) {
        handleManageMembers(selectedEvent); // Refresh modal data

        // Update dashboard list state
        setEvents(prev => prev.map(ev => {
          if (ev.id === selectedEvent.id) {
            return {
              ...ev,
              membersCount: Math.max(0, ev.membersCount - 1),
              // We don't track full members list in dashboard view usually, so just count
            };
          }
          return ev;
        }));
      }
    } catch (error) {
      console.error("Failed to remove member:", error);
      toast.error("Failed to remove member");
    }
  };

  const handleApproveRequest = async (userId: string) => {
    const regId = registrationMap[userId];
    if (!regId) return;
    try {
      await approveRegistration(regId);
      toast.success('Request Approved');

      if (selectedEvent) {
        handleManageMembers(selectedEvent); // Refresh modal data

        // Update dashboard list state
        setEvents(prev => prev.map(ev => {
          if (ev.id === selectedEvent.id) {
            return {
              ...ev,
              requests: ev.requests?.filter(r => r.id !== userId) || [],
              membersCount: ev.membersCount + 1
            };
          }
          return ev;
        }));
      }
    } catch (error) {
      console.error("Failed to approve request:", error);
      toast.error("Failed to approve request");
    }
  };

  const handleRejectRequest = async (userId: string) => {
    const regId = registrationMap[userId];
    if (!regId) return;
    try {
      await rejectRegistration(regId);
      toast.success('Request Rejected');

      if (selectedEvent) {
        handleManageMembers(selectedEvent); // Refresh modal data

        // Update dashboard list state
        setEvents(prev => prev.map(ev => {
          if (ev.id === selectedEvent.id) {
            return {
              ...ev,
              requests: ev.requests?.filter(r => r.id !== userId) || []
            };
          }
          return ev;
        }));
      }
    } catch (error) {
      console.error("Failed to reject request:", error);
      toast.error("Failed to reject request");
    }
  };

  const handleApproveAll = async () => {
    if (!selectedEvent || !selectedEvent.requests) return;
    try {
      await Promise.all(
        selectedEvent.requests.map(user => {
          const regId = registrationMap[user.id];
          if (regId) return approveRegistration(regId);
          return Promise.resolve();
        })
      );
      toast.success('All Requests Approved');

      if (selectedEvent) {
        handleManageMembers(selectedEvent);

        // Update dashboard list state
        setEvents(prev => prev.map(ev => {
          if (ev.id === selectedEvent.id) {
            const addedCount = ev.requests?.length || 0;
            return {
              ...ev,
              requests: [],
              membersCount: ev.membersCount + addedCount
            };
          }
          return ev;
        }));
      }
    } catch (error) {
      console.error("Failed to approve all:", error);
      toast.error("Failed to approve all requests");
    }
  };

  const handleRejectAll = async () => {
    if (!selectedEvent || !selectedEvent.requests) return;
    try {
      await Promise.all(
        selectedEvent.requests.map(user => {
          const regId = registrationMap[user.id];
          if (regId) return rejectRegistration(regId);
          return Promise.resolve();
        })
      );
      toast.success('All Requests Rejected');

      if (selectedEvent) {
        handleManageMembers(selectedEvent);

        // Update dashboard list state
        setEvents(prev => prev.map(ev => {
          if (ev.id === selectedEvent.id) {
            return {
              ...ev,
              requests: []
            };
          }
          return ev;
        }));
      }
    } catch (error) {
      console.error("Failed to reject all:", error);
      toast.error("Failed to reject all requests");
    }
  };

  const handleMarkCompleted = async (event: Event) => {
    try {
      await completeEvent(event.id);
      toast.success('Event Marked as Completed', {
        description: 'All participants have been notified and marked as completed.',
      });
      fetchEvents();
    } catch (error) {
      console.error("Failed to mark completed:", error);
      toast.error("Failed to complete event");
    }
  };

  const handleDeleteEvent = (event: Event) => {
    setEventToDelete(event);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (eventToDelete) {
      try {
        await deleteEvent(eventToDelete.id);
        toast.success('Event Deleted');
        fetchEvents();
      } catch (error) {
        console.error("Failed to delete event:", error);
        toast.error("Failed to delete event");
      }
      setEventToDelete(null);
    }
    setDeleteDialogOpen(false);
  };

  const handleCardClick = (event: Event) => {
    navigate(`/events/${event.id}`);
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

  const handleReportAction = (event: Event) => {
    // Decrement pending reports count when a report is resolved/rejected
    setEvents(prev => prev.map(ev => {
      if (ev.id === event.id) {
        return {
          ...ev,
          pendingReportsCount: Math.max(0, (ev.pendingReportsCount || 0) - 1)
        };
      }
      return ev;
    }));
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

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse text-muted-foreground">Loading dashboard...</div>
        </div>
      ) : (
        /* Tabs Section */
        <Tabs defaultValue="approved" className="w-full">
          <TabsList className="grid w-full max-w-4xl grid-cols-4 mb-6">
            <TabsTrigger value="approved">Approved ({approvedEvents.length})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({pendingEvents.length})</TabsTrigger>
            <TabsTrigger value="finished">Finished ({finishedEvents.length})</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled ({cancelledEvents.length})</TabsTrigger>
          </TabsList>

          {/* Approved Events Tab */}
          <TabsContent value="approved" className="mt-6">
            {approvedEvents.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-lg">No approved events.</p>
                <p className="text-sm mt-2">Create new events to get started.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {approvedEvents.map(event => (
                  <ManagerEventCard
                    key={event.id}
                    event={event}
                    onClick={() => handleCardClick(event)}
                    onManageMembers={handleManageMembers}
                    onMarkCompleted={handleMarkCompleted}
                    onEdit={handleEditEvent}
                    onDelete={handleDeleteEvent}
                    onReportAction={handleReportAction}
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
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingEvents.map(event => (
                  <ManagerEventCard
                    key={event.id}
                    event={event}
                    onClick={() => { }} // No navigation for pending events
                    onManageMembers={handleManageMembers}
                    onMarkCompleted={handleMarkCompleted}
                    onEdit={handleEditEvent}
                    onDelete={handleDeleteEvent}
                    onReportAction={handleReportAction}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Finished Events Tab */}
          <TabsContent value="finished" className="mt-6">
            {finishedEvents.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-lg">No finished events.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {finishedEvents.map(event => (
                  <ManagerEventCard
                    key={event.id}
                    event={event}
                    onClick={() => handleCardClick(event)}
                    onManageMembers={handleManageMembers}
                    onMarkCompleted={handleMarkCompleted}
                    onEdit={handleEditEvent}
                    onDelete={handleDeleteEvent}
                    onReportAction={handleReportAction}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Cancelled Events Tab */}
          <TabsContent value="cancelled" className="mt-6">
            {cancelledEvents.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-lg">No cancelled events.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cancelledEvents.map(event => (
                  <ManagerEventCard
                    key={event.id}
                    event={event}
                    onClick={() => handleCardClick(event)}
                    onManageMembers={handleManageMembers}
                    onMarkCompleted={handleMarkCompleted}
                    onEdit={handleEditEvent}
                    onDelete={handleDeleteEvent}
                    onReportAction={handleReportAction}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

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