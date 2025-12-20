import { useState } from 'react';
import { Calendar, MapPin, Users, Flag } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Event } from '@/types/event';
import { reportEvent } from '@/services/report.service';
import { toast } from 'sonner';

interface EventDetailModalProps {
  event: Event | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply?: (event: Event) => void;
}

export const EventDetailModal = ({ event, open, onOpenChange, onApply }: EventDetailModalProps) => {
  const [loading, setLoading] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportLoading, setReportLoading] = useState(false);

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

  const handleReport = async () => {
    if (!event || !reportReason) {
      toast.error('Please select a reason for reporting');
      return;
    }

    setReportLoading(true);
    try {
      await reportEvent(event.id, {
        reason: reportReason,
        description: reportDescription
      });
      toast.success('Event reported successfully', {
        description: 'Our team will review this report.'
      });
      setReportDialogOpen(false);
      setReportReason('');
      setReportDescription('');
    } catch (error) {
      console.error('Report failed:', error);
      toast.error('Failed to submit report');
    } finally {
      setReportLoading(false);
    }
  };

  if (!event) return null;

  return (
    <>
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
              variant="ghost"
              size="sm"
              onClick={() => setReportDialogOpen(true)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Flag className="h-4 w-4 mr-2" />
              Report
            </Button>
            <div className="flex-1" />
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

      {/* Report Dialog */}
      <AlertDialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Report Event</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for reporting this event. Our team will review it promptly.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason *</Label>
              <Select value={reportReason} onValueChange={setReportReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Spam">Spam</SelectItem>
                  <SelectItem value="Inappropriate Content">Inappropriate Content</SelectItem>
                  <SelectItem value="Fake Event">Fake Event</SelectItem>
                  <SelectItem value="Misleading Information">Misleading Information</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Additional Details (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Please provide more details about why you're reporting this event..."
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={reportLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReport}
              disabled={reportLoading || !reportReason}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {reportLoading ? 'Submitting...' : 'Submit Report'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
