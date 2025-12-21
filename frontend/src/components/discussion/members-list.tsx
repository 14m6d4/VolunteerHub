

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Search } from 'lucide-react';
import type { DiscussionUser } from '@/types/discussion';

interface MembersListProps {
  members: DiscussionUser[];
  managerId?: string;
}

export function MembersList({ members, managerId }: MembersListProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;
    const query = searchQuery.toLowerCase();
    return members.filter((member) =>
      member.name.toLowerCase().includes(query)
    );
  }, [members, searchQuery]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeVariant = (role: string) => {
    return role === 'manager' ? 'default' : 'secondary';
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search members..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Members Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredMembers.map((member) => {
          const isManager = managerId && (member.id === managerId || (member as any).userId === managerId);
          const displayRole = isManager ? 'manager' : member.role;
          return (
            <Card
              key={member.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/u/${(member as any).username || member.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={member.avatarUrl} alt={member.name} />
                    <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{member.name}</p>
                    <Badge variant={getRoleBadgeVariant(displayRole)} className="mt-1 capitalize">
                      {displayRole}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredMembers.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No members found matching "{searchQuery}"
        </div>
      )}
    </div>
  );
}
