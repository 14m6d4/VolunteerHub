import { useState, useEffect } from 'react';
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
  const [imageFile, setImageFile] = useState<File | null>(null);

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
      setImageFile(null); // Reset file on edit open
      // Use startAt field directly from backend (ISO string)
      if (event.startAt) {
        const parsedDate = new Date(event.startAt);
        if (!isNaN(parsedDate.getTime())) {
          setEventDate(parsedDate);
        } else {
          setEventDate(undefined);
        }
      } else {
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
      setImageFile(null);
    }
  }, [event, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventDate) {
      return;
    }
    // Pass startAt as ISO string for backend validation
    onSave({ ...formData, startAt: eventDate.toISOString(), imageFile } as any);
    onOpenChange(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setFormData(prev => ({ ...prev, image: previewUrl }));
    }
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

          {/* Image Upload */}
          <div className="space-y-2">
            <Label htmlFor="image">Event Image *</Label>
            <div className="flex flex-col gap-2">
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="cursor-pointer"
                required={!event && !imageFile} // Required only if creating new event and no file selected yet
              />
              {formData.image && (
                <div className="relative h-40 w-full overflow-hidden rounded-md border">
                  <img
                    src={formData.image}
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6"
                    onClick={() => {
                      setImageFile(null);
                      setFormData(prev => ({ ...prev, image: '' }));
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
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
