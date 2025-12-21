import { useState } from 'react';
import { Calendar, MapPin, Users, MoreVertical, Pencil, Trash2, CheckCircle, UserCog, FileWarning } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { EventReportsDialog } from '@/components/event/event-reports-dialog';
import type { Event } from '@/types/event';

interface ManagerEventCardProps {
  event: Event;
  onClick: () => void;
  onManageMembers: (event: Event) => void;
  onMarkCompleted: (event: Event) => void;
  onEdit: (event: Event) => void;
  onDelete: (event: Event) => void;
  onReportAction?: (event: Event) => void;
}

export const ManagerEventCard = ({
  event,
  onClick,
  onManageMembers,
  onMarkCompleted,
  onEdit,
  onDelete,
  onReportAction,
}: ManagerEventCardProps) => {
  const [reportsDialogOpen, setReportsDialogOpen] = useState(false);

  const getStatusBadge = () => {
    switch (event.managerStatus) {
      case 'active':
        return <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Pending Approval</Badge>;
      case 'completed':
        return <Badge variant="secondary">Completed</Badge>;
      default:
        return null;
    }
  };

  const handleMenuAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  // Helper to fix malformed URLs
  const getImageUrl = (url?: string) => {
    if (!url) return undefined;
    if (url.startsWith('//uploads')) {
      return `http://localhost:5000${url.substring(1)}`; // Removes one slash: /uploads/...
    }
    return url;
  };

  return (
    <>

      <Card className="flex flex-col h-full hover:shadow-lg transition-shadow bg-card" onClick={onClick}>
        <div className="relative h-48 w-full overflow-hidden rounded-t-lg bg-muted">
          {event.image ? (
            <img
              src={getImageUrl(event.image)}
              alt={event.title}
              className="h-full w-full object-cover transition-transform hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Calendar className="h-12 w-12" />
            </div>
          )}
          <div className="absolute top-3 left-3">
            {getStatusBadge()}
          </div>
          <div className="absolute top-3 right-3" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => handleMenuAction(e, () => onManageMembers(event))}>
                  <UserCog className="h-4 w-4 mr-2" />
                  Manage Members
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => handleMenuAction(e, () => setReportsDialogOpen(true))}>
                  <FileWarning className="h-4 w-4 mr-2" />
                  View Reports
                </DropdownMenuItem>
                {event.managerStatus === 'active' && (
                  <DropdownMenuItem onClick={(e) => handleMenuAction(e, () => onMarkCompleted(event))}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Completed
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={(e) => handleMenuAction(e, () => onEdit(event))}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit Details
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => handleMenuAction(e, () => onDelete(event))}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Event
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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

          {/* Pending Badges Row */}
          {((event.requests && event.requests.length > 0) || (event.pendingReportsCount !== undefined && event.pendingReportsCount > 0)) && (
            <div className="pt-2 border-t flex flex-wrap gap-2">
              {event.requests && event.requests.length > 0 && (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                  {event.requests.length} Pending Request{event.requests.length > 1 ? 's' : ''}
                </Badge>
              )}

              {event.pendingReportsCount !== undefined && event.pendingReportsCount > 0 && (
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                  {event.pendingReportsCount} Pending Report{event.pendingReportsCount > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <EventReportsDialog
        open={reportsDialogOpen}
        onOpenChange={setReportsDialogOpen}
        eventId={event.id}
        eventTitle={event.title}
        onReportAction={() => onReportAction?.(event)}
      />
    </>
  );
};
