import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { searchUsers as apiSearchUsers } from '@/services/user.service';
import { useRelations, useFriendActions } from '@/hooks/useFriends';
import type { FriendUser } from '@/services/friends.service';
import { useAuth } from '@/hooks/useAuth';

export default function SearchUsersPage() {
  const [q, setQ] = useState('');
  const [users, setUsers] = useState<FriendUser[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { data: relations = {} } = useRelations(users.map((u) => u._id));
  const { send } = useFriendActions();
  const sendingId = send.isPending ? send.variables : null;

  useEffect(() => {
    const t = setTimeout(() => {
      (async () => {
        if (!q) {
          setUsers([]);
          return;
        }
        setLoading(true);
        try {
          const res = await apiSearchUsers(q);
          setUsers(res.data ?? []);
        } catch (err) {
          console.error('Search users error', err);
        } finally {
          setLoading(false);
        }
      })();
    }, 300);

    return () => clearTimeout(t);
  }, [q]);

  const handleSend = (id: string) =>
    send.mutate(id, { onError: (err) => alert(err instanceof Error ? err.message : 'Unable to send request') });

  return (
    <div className="container mx-auto py-10 px-4 max-w-3xl">
      <h1 className="text-2xl mb-4">Search users</h1>
      <div className="mb-4">
        <Input placeholder="Search by username or name" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {loading && <div>Searching...</div>}

      <div className="space-y-3">
        {users.map((u) => {
          const relation = relations[u._id] ?? 'none';
          return (
          <div key={u._id} className="flex items-center justify-between p-3 border rounded">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={u.profilePicture || undefined} />
                <AvatarFallback>{u.username[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">{u.name || u.username}</div>
                <div className="text-sm text-muted-foreground">@{u.username}</div>
              </div>
            </div>

            <div>
              {relation === 'friends' && <Button size="sm" disabled>Friends</Button>}
              {relation === 'pending_sent' && <Button size="sm" disabled>Pending</Button>}
              {relation === 'pending_received' && <Button size="sm" disabled>Requested</Button>}
              {relation === 'none' && user && user.id !== u._id && (
                <Button size="sm" onClick={() => handleSend(u._id)} disabled={sendingId === u._id}>
                  {sendingId === u._id ? 'Sending...' : 'Add friend'}
                </Button>
              )}
            </div>
          </div>
        );
        })}
      </div>
    </div>
  );
}
