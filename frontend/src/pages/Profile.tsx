// frontend/src/pages/Profile.tsx

import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getPublicProfile, getFriends, sendFriendRequest, getRelations, removeFriend, getUserStats, getUserEventsList, getUserFriendsList } from '@/services/user.service';
import { getMyRegistrations, getEvents } from '@/services/event.service';
import { reportUser } from '@/services/report.service';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { EventCard } from '@/components/event/event-card';
import { ManagerEventCard } from '@/components/event/manager-event-card';
import { formatDate, formatEventDate } from '@/utils/formatDate';
import { toast } from 'sonner';
import type { PublicUserProfile, UserRole } from '@/types/user';
import type { Event } from '@/types/event';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  User,
  Calendar,
  Settings,
  UserPlus,
  Clock,
  Award,
  Users,
  CalendarDays,
  Loader2,
  UserMinus,
  Flag,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  ShieldX
} from 'lucide-react';

// User Stats Component
interface UserStats {
  eventsJoined: number;
  eventsOrganized: number;
  activeEvents?: number; // For managers only
  friends: number;
}

// Friend relation types
type FriendRelation = 'none' | 'friends' | 'pending_sent' | 'pending_received' | 'self';

// Event filter types
type EventFilter = 'all' | 'active' | 'completed';

// Pagination config
const ITEMS_PER_PAGE = 6;

// Report reasons
const REPORT_REASONS = [
  { value: 'spam', label: 'Spam or misleading' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'harassment', label: 'Harassment or abuse' },
  { value: 'impersonation', label: 'Impersonation' },
  { value: 'other', label: 'Other' },
];

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  // State
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [stats, setStats] = useState<UserStats>({ eventsJoined: 0, eventsOrganized: 0, friends: 0 });
  const [relation, setRelation] = useState<FriendRelation>('none');
  const [actionLoading, setActionLoading] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  // Search & Filter state
  const [eventSearch, setEventSearch] = useState('');
  const [eventFilter, setEventFilter] = useState<EventFilter>('all');
  const [friendSearch, setFriendSearch] = useState('');

  // Pagination state
  const [eventPage, setEventPage] = useState(1);
  const [friendPage, setFriendPage] = useState(1);

  // Report dialog state
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);

  const isOwnProfile = currentUser?.username === username;

  // Filtered & paginated events
  const filteredEvents = useMemo(() => {
    let result = events;

    // Apply search
    if (eventSearch.trim()) {
      const searchLower = eventSearch.toLowerCase();
      result = result.filter(e =>
        e.title.toLowerCase().includes(searchLower) ||
        e.location?.toLowerCase().includes(searchLower)
      );
    }

    // Apply filter
    if (eventFilter === 'active') {
      result = result.filter(e => !e.isPast);
    } else if (eventFilter === 'completed') {
      result = result.filter(e => e.isPast);
    }

    return result;
  }, [events, eventSearch, eventFilter]);

  const totalEventPages = Math.ceil(filteredEvents.length / ITEMS_PER_PAGE);
  const paginatedEvents = filteredEvents.slice(
    (eventPage - 1) * ITEMS_PER_PAGE,
    eventPage * ITEMS_PER_PAGE
  );

  // Filtered & paginated friends
  const filteredFriends = useMemo(() => {
    if (!friendSearch.trim()) return friends;
    const searchLower = friendSearch.toLowerCase();
    return friends.filter(f =>
      (f.name?.toLowerCase().includes(searchLower)) ||
      (f.username?.toLowerCase().includes(searchLower))
    );
  }, [friends, friendSearch]);

  const totalFriendPages = Math.ceil(filteredFriends.length / ITEMS_PER_PAGE);
  const paginatedFriends = filteredFriends.slice(
    (friendPage - 1) * ITEMS_PER_PAGE,
    friendPage * ITEMS_PER_PAGE
  );

  // Reset pagination when filters change
  useEffect(() => {
    setEventPage(1);
  }, [eventSearch, eventFilter]);

  useEffect(() => {
    setFriendPage(1);
  }, [friendSearch]);

  // Fetch profile data
  useEffect(() => {
    async function loadProfile() {
      if (!username) return;
      setLoading(true);
      setForbidden(false);
      try {
        // Fetch public profile
        const profileRes = await getPublicProfile(username);
        const profileData = profileRes.data || profileRes.user || profileRes;
        setProfile(profileData);

        // Fetch user statistics
        try {
          const statsRes = await getUserStats(username);
          const statsData = statsRes.data || statsRes;

          // Update stats based on role and profile being viewed
          if (statsData.stats) {
            // For managers, activeEvents is separate from eventsJoined
            if (profileData.role === 'manager') {
              setStats({
                eventsJoined: 0, // Managers don't join events
                eventsOrganized: statsData.stats.eventsOrganized || 0,
                activeEvents: statsData.stats.activeEvents || 0,
                friends: statsData.stats.friends || 0
              });
            } else {
              setStats({
                eventsJoined: statsData.stats.activeEvents || 0,
                eventsOrganized: statsData.stats.completedEvents || 0,
                activeEvents: undefined,
                friends: statsData.stats.friends || 0
              });
            }
          }
        } catch (statsErr: any) {
          // Handle 403 - admin profile
          if (statsErr.response?.status === 403 || statsErr.status === 403) {
            setForbidden(true);
            setLoading(false);
            return;
          }
          console.error('Failed to fetch stats:', statsErr);
        }

        // Fetch events and friends for the viewed user (public data)
        if (username) {
          try {
            const [eventsRes, friendsRes] = await Promise.all([
              getUserEventsList(username),
              getUserFriendsList(username)
            ]);

            const eventsData = eventsRes.data || eventsRes || [];
            const friendsData = friendsRes.data || friendsRes || [];

            // Transform events data
            const userEvents: Event[] = eventsData.map((e: any) => ({
              id: e._id || e.id,
              title: e.title,
              image: e.image,
              date: formatEventDate(e.startAt),
              location: e.location,
              membersCount: e.currentMembers || 0,
              isJoined: isOwnProfile,
              isPast: e.endAt && new Date(e.endAt) < new Date(),
              status: e.endAt && new Date(e.endAt) < new Date() ? 'past' : 'joined',
              tags: e.tags || [],
              description: e.description,
              // Add managerStatus for ManagerEventCard
              managerStatus: e.status === 'pending' ? 'pending'
                : e.status === 'approved' ? 'active'
                  : e.status === 'finished' ? 'completed'
                    : 'active'
            }));

            setEvents(userEvents);
            setFriends(friendsData);
          } catch (err) {
            console.error('Failed to fetch events/friends:', err);
          }
        }

        // Set relation between current user and viewed profile
        if (isOwnProfile) {
          setRelation('self');
        } else if (currentUser && profileData) {
          const userId = profileData._id || profileData.id;
          console.log('[Profile] Fetching relation for userId:', userId);
          if (userId) {
            try {
              const relRes = await getRelations([userId]);
              const relData = relRes.data || relRes || {};
              console.log('[Profile] Relation response:', relData);
              const userRelation = (relData[userId] as FriendRelation) || 'none';
              console.log('[Profile] Setting relation to:', userRelation);
              setRelation(userRelation);
            } catch (error) {
              console.error('[Profile] Failed to fetch relation:', error);
              setRelation('none');
            }
          }
        }
      } catch (err: any) {
        // Handle 403 for admin profiles
        if (err.response?.status === 403 || err.status === 403) {
          setForbidden(true);
        } else {
          console.error('Failed to load profile:', err);
          toast.error('Failed to load profile');
        }
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [username, currentUser, isOwnProfile]);

  // Handle friend request
  const handleSendFriendRequest = async () => {
    if (!profile) return;
    const userId = (profile as any)._id || (profile as any).id;
    if (!userId) return;

    setActionLoading(true);
    try {
      await sendFriendRequest(userId);
      setRelation('pending_sent');
      toast.success('Friend request sent!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send friend request');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle unfriend
  const handleUnfriend = async () => {
    if (!profile) return;
    const userId = (profile as any)._id || (profile as any).id;
    if (!userId) return;

    setActionLoading(true);
    try {
      await removeFriend(userId);
      setRelation('none');
      toast.success('Friend removed');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to remove friend');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle report user
  const handleReportSubmit = async () => {
    if (!reportReason.trim() || !profile) return;
    const userId = (profile as any)._id || (profile as any).id;
    if (!userId) return;

    setReportSubmitting(true);
    try {
      await reportUser(userId, {
        reason: reportReason,
        description: reportDescription.trim() || undefined
      });

      setReportSubmitted(true);
      toast.success('Report submitted successfully');

      setTimeout(() => {
        setReportReason('');
        setReportDescription('');
        setReportSubmitted(false);
        setReportDialogOpen(false);
      }, 1500);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit report');
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleReportDialogClose = (open: boolean) => {
    if (!reportSubmitting) {
      setReportReason('');
      setReportDescription('');
      setReportSubmitted(false);
      setReportDialogOpen(open);
    }
  };

  // Get role badge variant
  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-red-500 hover:bg-red-600">Admin</Badge>;
      case 'manager':
        return <Badge className="bg-blue-500 hover:bg-blue-600">Manager</Badge>;
      default:
        return <Badge variant="secondary">Volunteer</Badge>;
    }
  };

  // Get initials for avatar fallback
  const getInitials = (name?: string, username?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return username?.slice(0, 2).toUpperCase() || 'U';
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="container mx-auto py-10 px-4 max-w-5xl">
        <div className="space-y-8">
          {/* Header Skeleton */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <Skeleton className="h-32 w-32 rounded-full" />
                <div className="flex-1 space-y-3 text-center md:text-left">
                  <Skeleton className="h-8 w-48 mx-auto md:mx-0" />
                  <Skeleton className="h-4 w-64 mx-auto md:mx-0" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Content Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        </div>
      </div>
    );
  }

  // Show forbidden page for admin profiles
  if (forbidden) {
    return (
      <div className="container mx-auto py-10 px-4 max-w-2xl">
        <Card className="text-center py-12">
          <CardContent className="space-y-6">
            <div className="flex justify-center">
              <div className="p-4 rounded-full bg-red-100 dark:bg-red-900/30">
                <ShieldX className="h-16 w-16 text-red-600 dark:text-red-400" />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-4xl font-bold">403</h1>
              <h2 className="text-2xl font-semibold">Access Forbidden</h2>
              <p className="text-muted-foreground">
                Admin profiles are not accessible.
              </p>
            </div>

            <div className="flex justify-center gap-3">
              <Button onClick={() => navigate(-1)} variant="outline">
                Go Back
              </Button>
              <Button onClick={() => navigate('/')}>
                Go Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Profile not found
  if (!profile) {
    return (
      <div className="container mx-auto py-10 px-4 max-w-5xl">
        <Card className="text-center py-12">
          <CardContent>
            <User className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">User Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The user @{username} doesn't exist or their profile is private.
            </p>
            <Button onClick={() => navigate(-1)}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4 max-w-5xl">
      <div className="space-y-8">
        {/* Profile Header Card */}
        <Card className="relative">
          {/* Report Button - Top Right Corner (only for other users) */}
          {!isOwnProfile && currentUser && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-muted-foreground hover:text-destructive"
              onClick={() => setReportDialogOpen(true)}
            >
              <Flag className="h-4 w-4" />
            </Button>
          )}

          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* Avatar */}
              <Avatar className="h-32 w-32 border-4 border-background shadow-lg">
                <AvatarImage src={profile.profilePicture} alt={profile.name || profile.username} />
                <AvatarFallback className="text-3xl bg-primary/10">
                  {getInitials(profile.name, profile.username)}
                </AvatarFallback>
              </Avatar>

              {/* Info */}
              <div className="flex-1 text-center md:text-left space-y-3">
                {/* Line 1: Full Name (Bold) */}
                <h1 className="text-3xl font-bold">{profile.name || profile.username}</h1>

                {/* Line 2: @username • Role Badge • Member since Date */}
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-muted-foreground">
                  <span className="text-lg">@{profile.username}</span>
                  <span className="hidden sm:inline">•</span>
                  {getRoleBadge(profile.role)}
                  <span className="hidden sm:inline">•</span>
                  <div className="flex items-center gap-1 text-sm">
                    <Calendar className="h-4 w-4" />
                    <span>Member since {formatDate(profile.createdAt)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
                  {isOwnProfile ? (
                    <Button asChild>
                      <Link to={`/u/${username}/settings`}>
                        <Settings className="h-4 w-4 mr-2" />
                        Edit Profile
                      </Link>
                    </Button>
                  ) : (
                    <>
                      {/* Friend interaction buttons */}
                      {relation === 'none' && (
                        <Button onClick={handleSendFriendRequest} disabled={actionLoading}>
                          {actionLoading ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <UserPlus className="h-4 w-4 mr-2" />
                          )}
                          Add Friend
                        </Button>
                      )}
                      {relation === 'pending_sent' && (
                        <Button variant="secondary" disabled>
                          <Clock className="h-4 w-4 mr-2" />
                          Request Sent
                        </Button>
                      )}
                      {relation === 'pending_received' && (
                        <Button variant="outline">
                          <UserPlus className="h-4 w-4 mr-2" />
                          Respond to Request
                        </Button>
                      )}
                      {relation === 'friends' && (
                        <Button variant="outline" onClick={handleUnfriend} disabled={actionLoading}>
                          {actionLoading ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <UserMinus className="h-4 w-4 mr-2" />
                          )}
                          Unfriend
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards - Visible to all viewers */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                  <CalendarDays className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {profile?.role === 'manager' && stats.activeEvents !== undefined
                      ? stats.activeEvents
                      : stats.eventsJoined}
                  </p>
                  <p className="text-sm text-muted-foreground">Active Events</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <Award className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.eventsOrganized}</p>
                  <p className="text-sm text-muted-foreground">
                    {profile?.role === 'volunteer' ? 'Completed Events' : 'Events Organized'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30">
                  <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.friends || 0}</p>
                  <p className="text-sm text-muted-foreground">Friends</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs Content - Visible to all viewers */}
        <Tabs defaultValue="events" className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="events">
              <CalendarDays className="h-4 w-4 mr-2" />
              Events
            </TabsTrigger>
            <TabsTrigger value="friends">
              <Users className="h-4 w-4 mr-2" />
              Friends
            </TabsTrigger>
          </TabsList>

          {/* Events Tab */}
          <TabsContent value="events" className="mt-6">
            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search events..."
                  value={eventSearch}
                  onChange={(e) => setEventSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={eventFilter} onValueChange={(v) => setEventFilter(v as EventFilter)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {paginatedEvents.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paginatedEvents.map((event) => (
                    isOwnProfile && profile?.role === 'manager' ? (
                      <ManagerEventCard
                        key={event.id}
                        event={event}
                        onClick={() => navigate(`/events/${event.id}`)}
                        onManageMembers={() => { }}
                        onMarkCompleted={() => { }}
                        onEdit={() => { }}
                        onDelete={() => { }}
                      />
                    ) : (
                      <EventCard
                        key={event.id}
                        event={event}
                        onClick={() => navigate(`/events/${event.id}`)}
                      />
                    )
                  ))}
                </div>

                {/* Pagination */}
                {totalEventPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-6">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setEventPage(p => Math.max(1, p - 1))}
                      disabled={eventPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {eventPage} of {totalEventPages}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setEventPage(p => Math.min(totalEventPages, p + 1))}
                      disabled={eventPage === totalEventPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <Card className="text-center py-12">
                <CardContent>
                  <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    {eventSearch || eventFilter !== 'all' ? 'No matching events' : 'No Events Yet'}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {eventSearch || eventFilter !== 'all'
                      ? 'Try adjusting your search or filter.'
                      : "You haven't joined any events yet. Explore and join some!"}
                  </p>
                  {!eventSearch && eventFilter === 'all' && (
                    <Button asChild>
                      <Link to="/events">Browse Events</Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Friends Tab */}
          <TabsContent value="friends" className="mt-6">
            {/* Search Bar */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search friends..."
                value={friendSearch}
                onChange={(e) => setFriendSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {paginatedFriends.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {paginatedFriends.map((friend: any) => (
                    <Card
                      key={friend._id || friend.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => navigate(`/u/${friend.username}`)}
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={friend.profilePicture} />
                            <AvatarFallback>
                              {getInitials(friend.name, friend.username)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{friend.name || friend.username}</p>
                            <p className="text-sm text-muted-foreground truncate">@{friend.username}</p>
                          </div>
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={`/u/${friend.username}`}>View</Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Pagination */}
                {totalFriendPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-6">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setFriendPage(p => Math.max(1, p - 1))}
                      disabled={friendPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {friendPage} of {totalFriendPages}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setFriendPage(p => Math.min(totalFriendPages, p + 1))}
                      disabled={friendPage === totalFriendPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <Card className="text-center py-12">
                <CardContent>
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    {friendSearch ? 'No matching friends' : 'No Friends Yet'}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {friendSearch
                      ? 'Try a different search term.'
                      : 'Start connecting with other volunteers!'}
                  </p>
                  {!friendSearch && (
                    <Button asChild>
                      <Link to="/users?tab=search">Find Friends</Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Report User Dialog */}
        <Dialog open={reportDialogOpen} onOpenChange={handleReportDialogClose}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Flag className="h-5 w-5 text-destructive" />
                Report User
              </DialogTitle>
              <DialogDescription>
                Help us understand what's wrong. Your report will be reviewed by our team.
              </DialogDescription>
            </DialogHeader>

            {reportSubmitted ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-sm font-medium">Report submitted successfully!</p>
                <p className="text-xs text-muted-foreground">Thank you for helping keep our community safe.</p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="report-reason">Reason *</Label>
                    <Select value={reportReason} onValueChange={setReportReason}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a reason" />
                      </SelectTrigger>
                      <SelectContent>
                        {REPORT_REASONS.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="report-description">Additional details (optional)</Label>
                    <Textarea
                      id="report-description"
                      placeholder="Provide more context about your report..."
                      value={reportDescription}
                      onChange={(e) => setReportDescription(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                  <Button
                    variant="outline"
                    onClick={() => handleReportDialogClose(false)}
                    disabled={reportSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleReportSubmit}
                    disabled={!reportReason || reportSubmitting}
                  >
                    {reportSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Submit Report'
                    )}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}