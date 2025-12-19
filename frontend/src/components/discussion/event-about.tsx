// frontend/src/components/discussion/event-about.tsx

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, MapPin, Clock, Tag } from 'lucide-react';
import type { DiscussionEvent } from '@/types/discussion';
import { formatDate, formatTime, formatDateTime } from '@/utils/formatDate';

interface EventAboutProps {
  event: DiscussionEvent;
}

export function EventAbout({ event }: EventAboutProps) {
  return (
    <div className="space-y-6">
      {/* Event Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Event Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date */}
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium">Date</p>
              <p className="text-sm text-muted-foreground">{formatDate(event.date)}</p>
            </div>
          </div>

          {/* Time */}
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium">Time</p>
              <p className="text-sm text-muted-foreground">{formatTime(event.date)}</p>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium">Location</p>
              <p className="text-sm text-muted-foreground">{event.location}</p>
            </div>
          </div>

          <Separator />

          {/* Created At */}
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">Created</p>
              <p className="text-sm text-muted-foreground">{formatDateTime(event.createdAt)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tags Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Tags
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {event.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Description Card */}
      <Card>
        <CardHeader>
          <CardTitle>About This Event</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">
              {event.description}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
