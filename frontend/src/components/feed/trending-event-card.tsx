// frontend/src/components/feed/trending-event-card.tsx

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Users, TrendingUp, Sparkles } from 'lucide-react';
import { EventDetailModal } from '@/components/event/event-detail';
import type { TrendingEvent } from '@/types/feed';
import { toEventType } from '@/data/feed-mock';

interface TrendingEventCardProps {
  event: TrendingEvent;
}


export function TrendingEventCard({ event }: TrendingEventCardProps) {
  const [showDetail, setShowDetail] = useState(false);

  return (
    <>
      <Card className="w-full overflow-hidden border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 hover:border-primary/50 transition-all">
        {/* Suggested Badge */}
        <div className="px-4 pt-3 pb-1">
          <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Suggested for you</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 p-4 pt-2">
          {/* Event Image */}
          <div
            className="relative h-40 sm:h-32 sm:w-48 shrink-0 rounded-lg overflow-hidden cursor-pointer group"
            onClick={() => setShowDetail(true)}
          >
            <img
              src={event.image}
              alt={event.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          </div>

          {/* Event Info */}
          <CardContent className="flex-1 p-0 space-y-2">
            <h3
              className="font-semibold text-base line-clamp-2 cursor-pointer hover:text-primary transition-colors"
              onClick={() => setShowDetail(true)}
            >
              {event.title}
            </h3>

            {/* Trending Indicator */}
            {event.isTrending && event.trendingReason && (
              <div className="flex items-center gap-1.5 text-xs text-orange-600 dark:text-orange-400">
                <TrendingUp className="h-3.5 w-3.5" />
                <span className="font-medium">{event.trendingReason}</span>
              </div>
            )}

            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                <span>{event.date}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                <span>{event.membersCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                <span className="line-clamp-1">{event.location}</span>
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1">
              {event.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
                  {tag}
                </Badge>
              ))}
            </div>

            {/* Action Button */}
            <Button
              size="sm"
              className="mt-2"
              onClick={() => setShowDetail(true)}
            >
              View & Apply
            </Button>
          </CardContent>
        </div>
      </Card>

      {/* Event Detail Modal */}
      <EventDetailModal
        event={toEventType(event as any)}
        open={showDetail}
        onOpenChange={setShowDetail}
      />
    </>
  );
}
