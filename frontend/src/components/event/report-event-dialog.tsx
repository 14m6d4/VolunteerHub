import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Flag, CheckCircle } from 'lucide-react';
import apiFetch from '@/services/api';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface ReportEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
}

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam or misleading' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'harassment', label: 'Harassment or abuse' },
  { value: 'fraud', label: 'Fraud or scam' },
  { value: 'safety', label: 'Safety concern' },
  { value: 'other', label: 'Other' },
];

export function ReportEventDialog({
  open,
  onOpenChange,
  eventId,
  eventTitle,
}: ReportEventDialogProps) {
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) return;

    setIsSubmitting(true);
    try {
      await apiFetch('/report/event', {
        method: 'POST',
        body: JSON.stringify({
          reporterId: user?.id,
          eventId,
          reason,
          description: description.trim() || undefined,
        }),
      });

      setSubmitted(true);
      toast.success('Report submitted successfully');

      // Reset and close after showing success
      setTimeout(() => {
        setReason('');
        setDescription('');
        setSubmitted(false);
        onOpenChange(false);
      }, 1500);
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit report');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = (value: boolean) => {
    if (!isSubmitting) {
      setReason('');
      setDescription('');
      setSubmitted(false);
      onOpenChange(value);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[1000px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-destructive" />
            Report Event
          </DialogTitle>
          <DialogDescription>
            Help us understand what's wrong with this event. Your report will be reviewed by our
            moderation team.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-sm font-medium">Report submitted successfully!</p>
            <p className="text-xs text-muted-foreground">
              Thank you for helping keep our community safe.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Reporting event:</p>
                <p className="font-medium truncate">{eventTitle}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason for reporting</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {REPORT_REASONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Additional details (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Please provide any additional information about this report..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[100px] resize-none"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => handleClose(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!reason.trim() || isSubmitting}
                className="bg-destructive hover:bg-destructive/90"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Report'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
