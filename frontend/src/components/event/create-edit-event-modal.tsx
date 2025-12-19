import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { DateTimePicker } from '@/components/date-time-picker';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { Event } from '@/types/event';

interface CreateEditEventModalProps {
  event: Event | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (eventData: Partial<Event>) => void;
  availableTags: string[];
}

export const CreateEditEventModal = ({
  event,
  open,
  onOpenChange,
  onSave,
  availableTags,
}: CreateEditEventModalProps) => {
  const [formData, setFormData] = useState({
    title: '',
    image: '',
    location: '',
    tags: [] as string[],
    description: '',
  });
  const [eventDate, setEventDate] = useState<Date | undefined>();

  useEffect(() => {
    if (event) {
      // Edit mode - populate form
      setFormData({
        title: event.title,
        image: event.image,
        location: event.location,
        tags: event.tags || [],
        description: event.description,
      });
      // Parse date string to Date object
      // Assuming format: "Jan 15, 2026 - 8:00 AM"
      try {
        const dateStr = event.date.split(' - ')[0];
        const timeStr = event.date.split(' - ')[1];
        if (dateStr && timeStr) {
          const parsedDate = new Date(`${dateStr} ${timeStr}`);
          if (!isNaN(parsedDate.getTime())) {
            setEventDate(parsedDate);
          }
        }
      } catch (error) {
        setEventDate(undefined);
      }
    } else {
      // Create mode - reset form
      setFormData({
        title: '',
        image: '',
        location: '',
        tags: [],
        description: '',
      });
      setEventDate(undefined);
    }
  }, [event, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventDate) {
      return;
    }
    // Format date back to string: "Jan 15, 2026 - 8:00 AM"
    const formattedDate = format(eventDate, 'MMM d, yyyy') + ' - ' + format(eventDate, 'h:mm a');
    onSave({ ...formData, date: formattedDate });
    onOpenChange(false);
  };

  const toggleTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{event ? 'Edit Event' : 'Create New Event'}</DialogTitle>
          <DialogDescription>
            {event 
              ? 'Update event details. Saving will reset status to pending and require admin re-approval.'
              : 'Fill in the event details. The event will be pending until approved by an admin.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Event Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter event title"
              required
            />
          </div>

          {/* Image URL */}
          <div className="space-y-2">
            <Label htmlFor="image">Image URL *</Label>
            <Input
              id="image"
              value={formData.image}
              onChange={(e) => setFormData(prev => ({ ...prev, image: e.target.value }))}
              placeholder="https://example.com/image.jpg"
              required
            />
          </div>

          {/* Date & Location Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date & Time *</Label>
              <DateTimePicker date={eventDate} setDate={setEventDate} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location *</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Event location"
                required
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  {formData.tags.length === 0
                    ? 'Select tags'
                    : `${formData.tags.length} tag${formData.tags.length > 1 ? 's' : ''} selected`}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-4">
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Select Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {availableTags.map(tag => (
                      <Badge
                        key={tag}
                        variant={formData.tags.includes(tag) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => toggleTag(tag)}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            
            {/* Selected Tags Display */}
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => removeTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter event description..."
              rows={6}
              required
            />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {event ? 'Update Event' : 'Create Event'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
