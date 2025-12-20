import { useState } from 'react';
import { Calendar, MapPin, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Event } from '@/types/event';

interface EventDetailModalProps {
  event: Event | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply?: (event: Event) => void;
}

export const EventDetailModal = ({ event, open, onOpenChange, onApply }: EventDetailModalProps) => {
  const [loading, setLoading] = useState(false);

  const handleApply = async () => {
    if (event && onApply) {
      setLoading(true);
      await onApply(event);
      setLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  if (!event) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold pr-6">{event.title}</DialogTitle>
          <DialogDescription className="sr-only">
            Event details and application
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Event Image */}
          <div className="relative h-64 md:h-80 overflow-hidden rounded-lg">
            <img
              src={event.image}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Event Info Row */}
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-5 w-5" />
              <span className="font-medium">{event.date}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-5 w-5" />
              <span className="font-medium">{event.membersCount} members</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-5 w-5" />
              <span className="font-medium">{event.location}</span>
            </div>
          </div>

          {/* Tags */}
          {event.tags && event.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {event.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Description */}
          <div className="pt-2">
            <h4 className="font-semibold text-lg mb-2">About this event</h4>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
              {event.description}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Close
          </Button>
          <Button
            onClick={handleApply}
            disabled={loading}
            className="min-w-[100px]"
          >
            {loading ? 'Joining...' : 'Apply'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
