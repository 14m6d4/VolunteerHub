// frontend/src/components/discussion/report-dialog.tsx

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
import { Flag, AlertTriangle } from 'lucide-react';

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
}

export function ReportDialog({ open, onOpenChange, postId }: ReportDialogProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) return;

    setIsSubmitting(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // eslint-disable-next-line no-console
    console.log('Report submitted for post:', postId, 'Reason:', reason);

    setIsSubmitting(false);
    setSubmitted(true);

    // Reset and close after showing success
    setTimeout(() => {
      setReason('');
      setSubmitted(false);
      onOpenChange(false);
    }, 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-destructive" />
            Report Post
          </DialogTitle>
          <DialogDescription>
            Help us understand what's wrong with this post. Your report will be reviewed by our
            moderation team.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-sm font-medium">Report submitted successfully!</p>
            <p className="text-xs text-muted-foreground">Thank you for helping keep our community safe.</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reason">Reason for reporting</Label>
                <Textarea
                  id="reason"
                  placeholder="Please describe why you're reporting this post..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="min-h-[120px] resize-none"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
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
