import { Calendar, MapPin, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Event } from '@/types/event';

interface EventCardProps {
  event: Event;
  onClick: () => void;
  onLeave?: (event: Event) => void;
  showLeaveButton?: boolean;
}

export const EventCard = ({ event, onClick, onLeave, showLeaveButton = false }: EventCardProps) => {
  const getStatusBadge = () => {
    switch (event.status) {
      case 'joined':
        return <Badge className="bg-green-500 hover:bg-green-600">Joined</Badge>;
      case 'past':
        return <Badge variant="secondary">Completed</Badge>;
      case 'pending':
        return <Badge className="bg-blue-500 hover:bg-blue-600">Pending</Badge>;
      case 'available':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Available</Badge>;
      default:
        return null;
    }
  };

  // Check if event date is in the future
  const isEventInFuture = () => {
    try {
      const eventDateStr = event.date.split(' - ')[0]; // "Jan 15, 2026"
      const eventDate = new Date(eventDateStr);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return eventDate > today;
    } catch {
      return false;
    }
  };

  const canLeave = showLeaveButton && onLeave && isEventInFuture();

  const handleLeaveClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card onClick from firing
    if (onLeave) {
      onLeave(event);
    }
  };

  return (
    <Card 
      className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow duration-300 group"
      onClick={onClick}
    >
      <div className="relative h-48 overflow-hidden">
        <img 
          src={event.image} 
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-3 right-3">
          {getStatusBadge()}
        </div>
      </div>
      
      <CardContent className="p-4 space-y-3">
        <h3 className="font-semibold text-lg line-clamp-2 min-h-[3.5rem]">
          {event.title}
        </h3>
        
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            <span>{event.date}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            <span>{event.membersCount}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span className="line-clamp-1">{event.location}</span>
        </div>

        {event.tags && event.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {event.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {canLeave && (
          <Button
            variant="destructive"
            size="sm"
            className="w-full mt-2"
            onClick={handleLeaveClick}
          >
            Leave Event
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
