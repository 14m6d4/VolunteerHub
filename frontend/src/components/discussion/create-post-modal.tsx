// frontend/src/components/discussion/create-post-modal.tsx

import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Image, X } from 'lucide-react';
import { currentUser } from '@/data/discussion-mock';

interface CreatePostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPost: (content: string, imageUrl?: string) => void;
}

export function CreatePostModal({ open, onOpenChange, onPost }: CreatePostModalProps) {
  const [content, setContent] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePost = async () => {
    if (!content.trim()) return;

    setIsPosting(true);
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    onPost(content.trim(), imagePreview || undefined);

    // Reset form
    setContent('');
    setImagePreview(null);
    setIsPosting(false);
    onOpenChange(false);
  };

  const handleClose = () => {
    setContent('');
    setImagePreview(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Post</DialogTitle>
        </DialogHeader>

        <Separator />

        <div className="space-y-4">
          {/* User Info */}
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
              <AvatarFallback>{getInitials(currentUser.name)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-sm">{currentUser.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{currentUser.role}</p>
            </div>
          </div>

          {/* Content Input */}
          <Textarea
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[150px] resize-none border-0 focus-visible:ring-0 text-base p-0"
          />

          {/* Image Preview */}
          {imagePreview && (
            <div className="relative rounded-lg overflow-hidden border">
              <img
                src={imagePreview}
                alt="Upload preview"
                className="w-full h-auto max-h-60 object-cover"
              />
              <Button
                variant="secondary"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8 rounded-full bg-background/80 hover:bg-background"
                onClick={removeImage}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Add to your post:</span>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
              onClick={() => fileInputRef.current?.click()}
            >
              <Image className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button
            className="w-full"
            onClick={handlePost}
            disabled={!content.trim() || isPosting}
          >
            {isPosting ? 'Posting...' : 'Post'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
