import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EventCard } from '@/components/event/event-card';
import { EventDetailModal } from '@/components/event/event-detail';
import type { Event, EventFilters } from '@/types/event';

// Mock Data
const mockEvents: Event[] = [
  {
    id: '1',
    title: 'Beach Cleanup Initiative',
    image: 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?w=800&h=400&fit=crop',
    date: 'Jan 15, 2026 - 8:00 AM',
    location: 'Santa Monica Beach, CA',
    membersCount: 45,
    isJoined: true,
    isPast: false,
    status: 'joined',
    description: 'Join us for a morning of environmental stewardship as we clean up Santa Monica Beach. We\'ll provide all necessary equipment including gloves, bags, and collection tools. This is a great opportunity to make a tangible difference in our local ecosystem while meeting like-minded volunteers.\n\nWhat to bring: Sunscreen, water bottle, comfortable walking shoes.\nAll ages welcome! Refreshments will be provided after the cleanup.'
  },
  {
    id: '2',
    title: 'Food Bank Distribution Center',
    image: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=800&h=400&fit=crop',
    date: 'Jan 22, 2026 - 9:00 AM',
    location: 'Downtown Community Center',
    membersCount: 32,
    isJoined: true,
    isPast: false,
    status: 'pending',
    description: 'Help us sort and distribute food to families in need. We\'re looking for enthusiastic volunteers to assist with organizing donations, packing boxes, and helping with distribution.\n\nNo experience necessary - full training provided on-site. Shifts available from 9 AM to 5 PM. Even a few hours of your time makes a huge impact in our community.'
  },
  {
    id: '3',
    title: 'Senior Center Tech Workshop',
    image: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=800&h=400&fit=crop',
    date: 'Feb 5, 2026 - 2:00 PM',
    location: 'Riverside Senior Center',
    membersCount: 18,
    isJoined: true,
    isPast: false,
    status: 'joined',
    description: 'Share your tech knowledge with seniors! We\'re hosting a workshop to help older adults learn smartphone basics, video calling, and online safety. Your patience and guidance can help bridge the digital divide.\n\nIdeal for volunteers with good communication skills and basic tech knowledge. Materials and curriculum provided. Small group sessions ensure personalized attention.'
  },
  {
    id: '4',
    title: 'Community Garden Project',
    image: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800&h=400&fit=crop',
    date: 'Feb 12, 2026 - 10:00 AM',
    location: 'Greenfield Park',
    membersCount: 28,
    isJoined: false,
    isPast: false,
    status: 'available',
    description: 'Get your hands dirty and help build a sustainable community garden! We\'ll be planting vegetables, herbs, and flowers that will benefit the entire neighborhood. Learn about organic gardening techniques and sustainable agriculture.\n\nPerfect for nature lovers and anyone interested in local food systems. Tools provided, but bring your own gardening gloves if you have them. Light refreshments served.'
  },
  {
    id: '5',
    title: 'Animal Shelter Support Day',
    image: 'https://images.unsplash.com/photo-1548681528-6a5c45b66b42?w=800&h=400&fit=crop',
    date: 'Feb 18, 2026 - 9:00 AM',
    location: 'Happy Paws Animal Shelter',
    membersCount: 52,
    isJoined: false,
    isPast: false,
    status: 'available',
    description: 'Spend a rewarding day helping our furry friends! Activities include walking dogs, socializing cats, cleaning facilities, and assisting with adoption events. This is perfect for animal lovers who want to make a direct impact.\n\nOrientation session at 9 AM. Please wear comfortable, washable clothing. All volunteers must be 16+ or accompanied by an adult. Your love and care brighten these animals\' days!'
  },
  {
    id: '6',
    title: 'Youth Mentorship Program Kickoff',
    image: 'https://images.unsplash.com/photo-1529390079861-591de354faf5?w=800&h=400&fit=crop',
    date: 'Mar 1, 2026 - 3:30 PM',
    location: 'Lincoln High School',
    membersCount: 35,
    isJoined: false,
    isPast: false,
    status: 'available',
    description: 'Make a lasting impact as a youth mentor! We\'re launching a new program connecting volunteers with students who need academic support and positive role models. Commitment is one afternoon per week for the semester.\n\nIdeal for college students, professionals, and retirees. Background check required. Training sessions will cover mentoring best practices and program expectations. Change a young person\'s life trajectory!'
  },
  {
    id: '7',
    title: 'Marathon Water Station Volunteers',
    image: 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=800&h=400&fit=crop',
    date: 'Mar 8, 2026 - 6:00 AM',
    location: 'City Marathon Route - Mile 18',
    membersCount: 67,
    isJoined: false,
    isPast: false,
    status: 'available',
    description: 'Support marathon runners at our water station! We need energetic volunteers to hand out water, sports drinks, and encouragement to thousands of runners. It\'s an exciting, high-energy atmosphere.\n\nEarly morning start (6 AM) but you\'ll be done by noon. Free event t-shirt and breakfast provided. Perfect for groups, families, or anyone who loves the energy of race day!'
  },
  {
    id: '8',
    title: 'Habitat for Humanity Build',
    image: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&h=400&fit=crop',
    date: 'Mar 15, 2026 - 8:30 AM',
    location: 'Oakwood Estates Development',
    membersCount: 41,
    isJoined: false,
    isPast: false,
    status: 'available',
    description: 'Help build homes and hope! Join us for a weekend construction project with Habitat for Humanity. No construction experience necessary - skilled supervisors will guide all activities. Tasks include painting, landscaping, and light carpentry.\n\nPhysical work, so please bring water and wear sturdy shoes and weather-appropriate clothing. Lunch provided both days. See the direct result of your efforts as families move into affordable housing!'
  },
  {
    id: '9',
    title: 'Holiday Charity Drive',
    image: 'https://images.unsplash.com/photo-1607344645866-009c320b63e0?w=800&h=400&fit=crop',
    date: 'Dec 10, 2025 - 10:00 AM',
    location: 'City Hall Plaza',
    membersCount: 89,
    isJoined: true,
    isPast: true,
    status: 'past',
    description: 'Our annual holiday charity drive was a huge success! We collected toys, clothing, and food for families in need during the holiday season. Volunteers helped sort donations, wrap gifts, and distribute items to local families.\n\nThank you to all who participated in making this a memorable event for our community!'
  },
  {
    id: '10',
    title: 'Park Tree Planting',
    image: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&h=400&fit=crop',
    date: 'Nov 28, 2025 - 8:00 AM',
    location: 'Riverside Park',
    membersCount: 56,
    isJoined: true,
    isPast: true,
    status: 'past',
    description: 'We planted over 100 trees in Riverside Park to help combat climate change and beautify our neighborhood. Volunteers learned proper tree planting techniques and contributed to our city\'s green initiatives.\n\nA fantastic day of environmental action that will benefit our community for generations to come!'
  },
  {
    id: '11',
    title: 'Thanksgiving Community Dinner',
    image: 'https://images.unsplash.com/photo-1574672280600-4accfa5b6f98?w=800&h=400&fit=crop',
    date: 'Nov 23, 2025 - 4:00 PM',
    location: 'Community Kitchen',
    membersCount: 73,
    isJoined: true,
    isPast: true,
    status: 'past',
    description: 'We served over 300 meals to community members during our annual Thanksgiving dinner. Volunteers helped with cooking, serving, and creating a warm, welcoming atmosphere for all attendees.\n\nA heartwarming event that brought our community together during the holiday season!'
  }
];

export const EventsList = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<EventFilters>({
    searchQuery: '',
    sortBy: 'date',
  });
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Filter and sort events
  const processedEvents = useMemo(() => {
    let filtered = mockEvents.filter(event =>
      event.title.toLowerCase().includes(filters.searchQuery.toLowerCase())
    );

    // Sort events
    filtered.sort((a, b) => {
      if (filters.sortBy === 'date') {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      } else {
        return b.membersCount - a.membersCount;
      }
    });

    return filtered;
  }, [filters]);

  const myEvents = processedEvents.filter(event => event.isJoined && !event.isPast);
  const discoverEvents = processedEvents.filter(event => !event.isJoined && !event.isPast);
  const pastEvents = processedEvents.filter(event => event.isJoined && event.isPast);

  const handleMyEventClick = (event: Event) => {
    navigate(`/events/${event.id}`);
  };

  const handleDiscoverEventClick = (event: Event) => {
    setSelectedEvent(event);
    setModalOpen(true);
  };

  const handleLeaveEvent = (event: Event) => {
    // Show confirmation toast
    toast.success('Left Event', {
      description: `You have left "${event.title}".`,
    });
    // In a real application, this would make an API call to unregister
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-6">Volunteer Events</h1>
        
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
      </div>

      {/* Tabs Section */}
      <Tabs defaultValue="my-events" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-3 mb-6">
          <TabsTrigger value="my-events">My Events</TabsTrigger>
          <TabsTrigger value="discover">Discover</TabsTrigger>
          <TabsTrigger value="past-events">Past Events</TabsTrigger>
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
      />
    </div>
  );
};
