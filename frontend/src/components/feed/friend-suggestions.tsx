// frontend/src/components/feed/friend-suggestions.tsx

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserPlus, Users, Check } from 'lucide-react';
import { toast } from 'sonner';
import type { FriendSuggestion } from '@/types/feed';

interface FriendSuggestionsProps {
  suggestions: FriendSuggestion[];
  onAddFriend?: (id: string) => Promise<void>;
}

export function FriendSuggestions({ suggestions, onAddFriend }: FriendSuggestionsProps) {
  const [addedFriends, setAddedFriends] = useState<Set<string>>(new Set());
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleAddFriendClick = async (suggestion: FriendSuggestion) => {
    if (!onAddFriend) return;

    setLoadingIds(prev => new Set([...prev, suggestion.id]));
    try {
      await onAddFriend(suggestion.id);
      setAddedFriends((prev) => new Set([...prev, suggestion.id]));
      toast.success(`Friend request sent to ${suggestion.name}`);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingIds(prev => {
        const next = new Set(prev);
        next.delete(suggestion.id);
        return next;
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Users className="h-4 w-4" />
          People You May Know
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="h-auto max-h-[calc(100vh-200px)]">
          <div className="space-y-3 pr-2">
            {suggestions.map((suggestion) => {
              const isAdded = addedFriends.has(suggestion.id);
              return (
                <div
                  key={suggestion.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  {/* User Avatar */}
                  <Link to={`/u/${suggestion.username}`} className="shrink-0">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={suggestion.avatarUrl} alt={suggestion.name} />
                      <AvatarFallback>{getInitials(suggestion.name)}</AvatarFallback>
                    </Avatar>
                  </Link>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/u/${suggestion.username}`}
                      className="text-sm font-medium hover:underline line-clamp-1"
                    >
                      {suggestion.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">@{suggestion.username}</p>
                    {(suggestion.mutualFriends || 0) > 0 && (
                      <p className="text-[10px] text-muted-foreground">
                        {suggestion.mutualFriends} mutual friend{suggestion.mutualFriends! > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>

                  {/* Add Friend Button */}
                  <Button
                    variant={isAdded ? 'secondary' : 'outline'}
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => !isAdded && handleAddFriendClick(suggestion)}
                    disabled={isAdded || loadingIds.has(suggestion.id)}
                  >
                    {loadingIds.has(suggestion.id) ? (
                      <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    ) : isAdded ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <UserPlus className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              );
            })}

            {suggestions.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No suggestions available
              </p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
