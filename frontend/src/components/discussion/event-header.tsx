

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users } from 'lucide-react';
import type { DiscussionEvent } from '@/types/discussion';

interface EventHeaderProps {
  event: DiscussionEvent;
}

export function EventHeader({ event }: EventHeaderProps) {
  const formatMembersCount = (count: number) => {
    const safeCount = count || 0;
    if (safeCount >= 1000) {
      return `${(safeCount / 1000).toFixed(1)}K`;
    }
    return safeCount.toString();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const displayMembers = (event.members || []).slice(0, 3);
  const remainingCount = Math.max(0, (event.members || []).length - 3);

  return (
    <div className="w-full">
      {/* Banner Image */}
      <div className="relative w-full h-48 sm:h-64 md:h-80 overflow-hidden rounded-b-xl">
        <img
          src={event.bannerImage || event.image}
          alt={event.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      </div>

      {/* Event Info */}
      <div className="px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        <div className="bg-background rounded-xl shadow-lg p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Title and Members Count */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">{event.title}</h1>
              <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span className="text-sm">{formatMembersCount(event.membersCount)} members</span>
              </div>
            </div>

            {/* Avatar Stack */}
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {displayMembers.map((member, index) => (
                  <Avatar
                    key={member.id}
                    className="ring-2 ring-background h-9 w-9"
                    style={{ zIndex: displayMembers.length - index }}
                  >
                    <AvatarImage src={member.avatar || (member as any).avatarUrl} alt={member.name} />
                    <AvatarFallback className="text-xs">
                      {getInitials(member.name)}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              {remainingCount > 0 && (
                <span className="text-sm text-muted-foreground">
                  and others
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
