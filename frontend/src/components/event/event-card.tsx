import { useState } from 'react';
import { Calendar, MapPin, Users, Flag } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ReportEventDialog } from '@/components/event/report-event-dialog';
import type { Event } from '@/types/event';

interface EventCardProps {
  event: Event;
  onClick: () => void;
  onLeave?: (event: Event) => void;
  showLeaveButton?: boolean;
}

export const EventCard = ({ event, onClick, onLeave, showLeaveButton = false }: EventCardProps) => {
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  const getStatusBadge = () => {
    switch (event.status) {
      case 'joined':
        return <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>;
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

  const canLeave = showLeaveButton && onLeave && !event.isPast;

  const handleLeaveClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card onClick from firing
    if (onLeave) {
      onLeave(event);
    }
  };

  const handleReportClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setReportDialogOpen(true);
  };

  return (
    <>
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
          <div className="absolute top-3 left-3" onClick={(e) => e.stopPropagation()}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8 opacity-80 hover:opacity-100"
                    onClick={handleReportClick}
                  >
                    <Flag className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Report Event</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
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

      <ReportEventDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        eventId={event.id}
        eventTitle={event.title}
      />
    </>
  );
};
