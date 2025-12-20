import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { searchUsers as apiSearchUsers, sendFriendRequest, getRelations } from '@/services/user.service';
import { useAuth } from '@/context/AuthContext';

export default function SearchUsersPage() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const t = setTimeout(() => {
      (async () => {
        if (!q) {
          setResults([]);
          return;
        }
        setLoading(true);
        try {
          const res = await apiSearchUsers(q);
          const users = res.data || res || [];
          const ids = users.map((u: any) => u._id);
          const rel = (ids.length > 0) ? ((await getRelations(ids)).data || {}) : {};
          const enriched = users.map((u: any) => ({ ...u, relation: rel[u._id] || 'none' }));
          setResults(enriched);
        } catch (err) {
          console.error('Search users error', err);
        } finally {
          setLoading(false);
        }
      })();
    }, 300);

    return () => clearTimeout(t);
  }, [q]);

  const handleSend = async (id: string) => {
    setSendingId(id);
    try {
      await sendFriendRequest(id);
      alert('Friend request sent');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Unable to send request');
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div className="container mx-auto py-10 px-4 max-w-3xl">
      <h1 className="text-2xl mb-4">Search users</h1>
      <div className="mb-4">
        <Input placeholder="Search by username or name" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {loading && <div>Searching...</div>}

      <div className="space-y-3">
        {results.map((u) => (
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
              {u.relation === 'friends' && <Button size="sm" disabled>Friends</Button>}
              {u.relation === 'pending_sent' && <Button size="sm" disabled>Pending</Button>}
              {u.relation === 'pending_received' && <Button size="sm" disabled>Requested you</Button>}
              {u.relation === 'none' && user && user.id !== u._id && (
                <Button size="sm" onClick={() => handleSend(u._id)} disabled={sendingId === u._id}>
                  {sendingId === u._id ? 'Sending...' : 'Add friend'}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
