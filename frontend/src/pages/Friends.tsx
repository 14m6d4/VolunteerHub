import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import useAuth from '@/hooks/useAuth';
import { acceptFriendRequest, getFriendRequests as apiGetRequests, sendFriendRequest, getRelations, getSentFriendRequests, cancelFriendRequest } from '@/services/user.service';
import { searchUsers as apiSearchUsers } from '@/services/user.service';

import { useSearchParams } from 'react-router-dom';

// ...

export default function FriendsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') as 'friends' | 'requests' | 'sent' | 'search' || 'friends';

  // Helper to update URL when tab changes
  const setTab = (val: string) => {
    setSearchParams({ tab: val });
  };
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!user) return;
      try {
        const res = await apiGetRequests();
        setRequests(res.data || res || []);
      } catch (err) {
        console.error('Failed to fetch requests', err);
      }
    })();
  }, [user]);

  useEffect(() => {
    (async () => {
      if (!user) return;
      try {
        const res = await getSentFriendRequests();
        setSentRequests(res.data || res || []);
      } catch (err) {
        console.error('Failed to fetch sent requests', err);
      }
    })();
  }, [user]);

  useEffect(() => {
    (async () => {
      if (!user) return;
      try {
        const res = await (await import('@/services/user.service')).getFriends();
        const list = res.data || res || [];
        setFriends(list);
      } catch (err) {
        console.error('Failed to fetch friends', err);
      }
    })();
  }, [user]);

  useEffect(() => {
    const t = setTimeout(() => {
      (async () => {
        if (!query) {
          setResults([]);
          return;
        }
        setLoading(true);
        try {
          const res = await apiSearchUsers(query);
          const users = res.data || res || [];
          // Batch get relations (only when we have ids)
          const ids = users.map((u: any) => u._id || u.id).filter(Boolean);
          let rel: Record<string, string> = {};
          if (ids.length > 0) {
            try {
              rel = (await getRelations(ids)).data || {};
            } catch (e) {
              // Backend returns 400 when ids is empty; treat as all 'none'
              console.warn('getRelations failed', e);
              rel = {};
            }
          }
          const enriched = users.map((u: any) => ({ ...u, relation: rel[u._id || u.id] || 'none' }));
          setResults(enriched);
        } catch (err) {
          console.error('Search users error', err);
        } finally {
          setLoading(false);
        }
      })();
    }, 300);

    return () => clearTimeout(t);
  }, [query, user]);

  const handleSend = async (id: string) => {
    try {
      await sendFriendRequest(id);
      setResults(prev => prev.map(r => r._id === id ? { ...r, relation: 'pending_sent' } : r));
      alert('Friend request sent');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Unable to send request');
    }
  };

  const handleAccept = async (requestId: string) => {
    const reqItem = requests.find((r: any) => r._id === requestId);
    const sender = reqItem?.sender;
    try {
      setAcceptingId(requestId);
      await acceptFriendRequest(requestId);

      // remove from requests list
      setRequests(prev => prev.filter(r => r._id !== requestId));

      // optimistic update: add sender to friends if available
      if (sender) {
        setFriends(prev => {
          const sid = sender._id || sender.id || sender.username;
          if (prev.some((f: any) => (f._id || f.id || f.username) === sid)) return prev;
          return [sender, ...prev];
        });

        // also update any search results to reflect new relation
        setResults(prev => prev.map((u: any) => ({ ...u, relation: (u._id === (sender._id || sender.id) ? 'friends' : u.relation) })));
      }

      // refresh full friends list to ensure consistency
      try {
        const friendsRes = await (await import('@/services/user.service')).getFriends();
        const list = friendsRes.data || friendsRes || [];
        setFriends(list);
      } catch (err) {
        console.warn('Failed to refresh friends after accept', err);
      }

      alert('Accepted');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Unable to accept');
    } finally {
      setAcceptingId(null);
    }
  };

  const handleUnfriend = async (friendId: string) => {
    try {
      const { removeFriend } = await import('@/services/user.service');
      await removeFriend(friendId);
      setFriends(prev => prev.filter((f: any) => (f._id || f.id || f.username) !== friendId));
      alert('Friend removed');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Unable to remove friend');
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      setCancellingId(requestId);
      await cancelFriendRequest(requestId);
      setSentRequests(prev => prev.filter(r => r._id !== requestId));
      alert('Request cancelled');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Unable to cancel request');
    } finally {
      setCancellingId(null);
    }
  };

  const handleUserClick = (username: string) => {
    navigate(`/u/${username}`);
  };

  return (
    <div className="container mx-auto py-10 px-4 max-w-4xl">
      <h1 className="text-2xl mb-4">Users</h1>
      <Tabs value={currentTab} onValueChange={(v) => setTab(v)}>
        <TabsList>
          <TabsTrigger value="friends">Friends</TabsTrigger>
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="sent">Sent</TabsTrigger>
          <TabsTrigger value="search">Search</TabsTrigger>
        </TabsList>

        <TabsContent value="friends">
          <div className="space-y-3">
            {friends.map((f: any) => (
              <div
                key={f._id || f.id}
                className="flex items-center justify-between p-3 border rounded cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => handleUserClick(f.username)}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10"><AvatarImage src={f.profilePicture || undefined} /><AvatarFallback>{(f.username || f.name || '?')[0]?.toUpperCase()}</AvatarFallback></Avatar>
                  <div>
                    <div className="font-medium">{f.name || f.username}</div>
                    <div className="text-sm text-muted-foreground">@{f.username}</div>
                  </div>
                </div>
                <div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnfriend(f._id || f.id || f.username);
                    }}
                  >
                    Unfriend
                  </Button>
                </div>
              </div>
            ))}
            {friends.length === 0 && <div className="text-sm text-muted-foreground">You have no friends yet</div>}
          </div>
        </TabsContent>

        <TabsContent value="requests">
          <div className="space-y-3">
            {requests.map((r: any) => (
              <div
                key={r._id}
                className="flex items-center justify-between p-3 border rounded cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => handleUserClick(r.sender.username)}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10"><AvatarImage src={r.sender.profilePicture || undefined} /><AvatarFallback>{r.sender.username[0]?.toUpperCase()}</AvatarFallback></Avatar>
                  <div>
                    <div className="font-medium">{r.sender.name || r.sender.username}</div>
                    <div className="text-sm text-muted-foreground">@{r.sender.username}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAccept(r._id);
                    }}
                    disabled={acceptingId === r._id}
                  >
                    {acceptingId === r._id ? 'Accepting...' : 'Accept'}
                  </Button>
                </div>
              </div>
            ))}
            {requests.length === 0 && <div className="text-sm text-muted-foreground">No pending requests</div>}
          </div>
        </TabsContent>

        <TabsContent value="sent">
          <div className="space-y-3">
            {sentRequests.map((r: any) => (
              <div
                key={r._id}
                className="flex items-center justify-between p-3 border rounded cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => handleUserClick(r.receiver.username)}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10"><AvatarImage src={r.receiver.profilePicture || undefined} /><AvatarFallback>{r.receiver.username[0]?.toUpperCase()}</AvatarFallback></Avatar>
                  <div>
                    <div className="font-medium">{r.receiver.name || r.receiver.username}</div>
                    <div className="text-sm text-muted-foreground">@{r.receiver.username}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCancelRequest(r._id);
                    }}
                    disabled={cancellingId === r._id}
                  >
                    {cancellingId === r._id ? 'Cancelling...' : 'Cancel'}
                  </Button>
                </div>
              </div>
            ))}
            {sentRequests.length === 0 && <div className="text-sm text-muted-foreground">No sent requests</div>}
          </div>
        </TabsContent>

        <TabsContent value="search">
          <div className="mb-4">
            <Input placeholder="Search by username or name" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>

          {loading && <div>Searching...</div>}

          <div className="space-y-3">
            {results.map((u: any) => (
              <div
                key={u._id}
                className="flex items-center justify-between p-3 border rounded cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => handleUserClick(u.username)}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10"><AvatarImage src={u.profilePicture || undefined} /><AvatarFallback>{u.username[0]?.toUpperCase()}</AvatarFallback></Avatar>
                  <div>
                    <div className="font-medium">{u.name || u.username}</div>
                    <div className="text-sm text-muted-foreground">@{u.username}</div>
                  </div>
                </div>
                <div>
                  {u.relation === 'friends' && <Button size="sm" disabled>Friends</Button>}
                  {u.relation === 'pending_sent' && <Button size="sm" disabled>Pending</Button>}
                  {u.relation === 'pending_received' && <Button size="sm" disabled>Requested</Button>}
                  {u.relation === 'none' && user && user.id !== u._id && (
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSend(u._id);
                      }}
                    >
                      Add friend
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {results.length === 0 && !loading && <div className="text-sm text-muted-foreground">No results</div>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
