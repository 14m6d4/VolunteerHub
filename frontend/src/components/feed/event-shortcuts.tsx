

import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bookmark } from 'lucide-react';
import type { EventShortcut } from '@/types/feed';

interface EventShortcutsProps {
  events: EventShortcut[];
}

export function EventShortcuts({ events }: EventShortcutsProps) {
  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Bookmark className="h-4 w-4" />
          Events Shortcuts
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="h-auto max-h-[calc(100vh-200px)]">
          <div className="space-y-2 pr-2">
            {events.map((event) => (
              <Link
                key={event.id}
                to={`/events/${event.id}`}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors group"
              >
                {/* Event Image - Rounded Square */}
                <div className="h-10 w-10 rounded-lg overflow-hidden shrink-0">
                  <img
                    src={event.image}
                    alt={event.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>

                {/* Event Title */}
                <span className="text-sm font-medium line-clamp-2 flex-1">
                  {event.title}
                </span>
              </Link>
            ))}

            {events.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No events joined yet
              </p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
