import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import useAuth from '@/hooks/useAuth';
import {
  acceptFriendRequest,
  getFriendRequests as apiGetRequests,
  sendFriendRequest,
  getRelations,
  getSentFriendRequests,
  cancelFriendRequest,
  rejectFriendRequest,
  searchUsers as apiSearchUsers
} from '@/services/user.service';
import {
  Users,
  UserPlus,
  Send,
  Search,
  Check,
  X,
  Loader2,
  UserX,
  Clock,
  Heart
} from 'lucide-react';
import { toast } from 'sonner';

interface User {
  _id: string;
  id?: string;
  username: string;
  name?: string;
  profilePicture?: string;
  relation?: string;
}

interface FriendRequest {
  _id: string;
  sender: User;
  receiver: User;
  createdAt?: string;
}

export default function FriendsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') as 'friends' | 'requests' | 'sent' | 'search' || (user ? 'friends' : 'search');

  const setTab = (val: string) => {
    setSearchParams({ tab: val });
  };

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<User[]>([]);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [sendingToId, setSendingToId] = useState<string | null>(null);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [loadingSent, setLoadingSent] = useState(false);

  // Fetch friend requests
  useEffect(() => {
    (async () => {
      if (!user) return;
      try {
        setLoadingRequests(true);
        const res = await apiGetRequests();
        setRequests(res.data || res || []);
      } catch (err) {
        console.error('Failed to fetch requests', err);
        toast.error('Failed to load friend requests');
      } finally {
        setLoadingRequests(false);
      }
    })();
  }, [user]);

  // Fetch sent requests
  useEffect(() => {
    (async () => {
      if (!user) return;
      try {
        setLoadingSent(true);
        const res = await getSentFriendRequests();
        setSentRequests(res.data || res || []);
      } catch (err) {
        console.error('Failed to fetch sent requests', err);
        toast.error('Failed to load sent requests');
      } finally {
        setLoadingSent(false);
      }
    })();
  }, [user]);

  // Fetch friends list
  useEffect(() => {
    (async () => {
      if (!user) return;
      try {
        setLoadingFriends(true);
        const res = await (await import('@/services/user.service')).getFriends();
        const list = res.data || res || [];
        setFriends(list);
      } catch (err) {
        console.error('Failed to fetch friends', err);
        toast.error('Failed to load friends');
      } finally {
        setLoadingFriends(false);
      }
    })();
  }, [user]);

  // Search users with debounce
  useEffect(() => {
    const t = setTimeout(() => {
      (async () => {
        if (!query.trim()) {
          setResults([]);
          return;
        }
        setLoading(true);
        try {
          const res = await apiSearchUsers(query);
          const users = res.data || res || [];
          const ids = users.map((u: User) => u._id || u.id).filter(Boolean);
          let rel: Record<string, string> = {};
          if (user && ids.length > 0) {
            try {
              rel = (await getRelations(ids)).data || {};
            } catch (e) {
              console.warn('getRelations failed', e);
              rel = {};
            }
          }
          const enriched = users.map((u: User) => ({ ...u, relation: rel[u._id || u.id!] || 'none' }));
          setResults(enriched);
        } catch (err) {
          console.error('Search users error', err);
          toast.error('Search failed');
        } finally {
          setLoading(false);
        }
      })();
    }, 400);

    return () => clearTimeout(t);
  }, [query, user]);

  const handleSend = async (id: string) => {
    try {
      setSendingToId(id);
      await sendFriendRequest(id);
      setResults(prev => prev.map(r => r._id === id ? { ...r, relation: 'pending_sent' } : r));
      toast.success('Friend request sent');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Unable to send request');
    } finally {
      setSendingToId(null);
    }
  };

  const handleAccept = async (requestId: string) => {
    const reqItem = requests.find((r) => r._id === requestId);
    const sender = reqItem?.sender;
    try {
      setAcceptingId(requestId);
      await acceptFriendRequest(requestId);

      setRequests(prev => prev.filter(r => r._id !== requestId));

      if (sender) {
        setFriends(prev => {
          const sid = sender._id || sender.id || sender.username;
          if (prev.some((f) => (f._id || f.id || f.username) === sid)) return prev;
          return [sender, ...prev];
        });

        setResults(prev => prev.map((u) => ({ ...u, relation: (u._id === (sender._id || sender.id) ? 'friends' : u.relation) })));
      }

      toast.success('Friend request accepted');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Unable to accept');
    } finally {
      setAcceptingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      setRejectingId(requestId);
      await rejectFriendRequest(requestId);
      setRequests(prev => prev.filter(r => r._id !== requestId));
      toast.success('Friend request declined');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Unable to reject request');
    } finally {
      setRejectingId(null);
    }
  };

  const handleUnfriend = async (friendId: string) => {
    if (!window.confirm('Are you sure you want to remove this friend?')) return;
    try {
      const { removeFriend } = await import('@/services/user.service');
      await removeFriend(friendId);
      setFriends(prev => prev.filter((f) => (f._id || f.id || f.username) !== friendId));
      setResults(prev => prev.map(u => (u._id === friendId || u.id === friendId) ? { ...u, relation: 'none' } : u));
      toast.success('Friend removed');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Unable to remove friend');
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      setCancellingId(requestId);
      await cancelFriendRequest(requestId);
      setSentRequests(prev => prev.filter(r => r._id !== requestId));
      toast.success('Request cancelled');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Unable to cancel request');
    } finally {
      setCancellingId(null);
    }
  };

  const handleUserClick = (username: string) => {
    navigate(`/u/${username}`);
  };

  return (
    <div className="container mx-auto py-10 px-4 max-w-4xl">
      <h1 className="text-2xl mb-4 font-bold">{user ? 'Network' : 'Search Volunteers'}</h1>
      <Tabs value={currentTab} onValueChange={(v) => setTab(v)}>
        {user && (
          <TabsList className="mb-6">
            <TabsTrigger value="friends">Friends</TabsTrigger>
            <TabsTrigger value="requests">Requests {requests.length > 0 && <Badge variant="secondary" className="ml-2 bg-primary/20">{requests.length}</Badge>}</TabsTrigger>
            <TabsTrigger value="sent">Sent</TabsTrigger>
            <TabsTrigger value="search">Search</TabsTrigger>
          </TabsList>
        )}

        {/* Friends Tab */}
        <TabsContent value="friends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-primary" />
                My Friends
              </CardTitle>
              <CardDescription>
                People you're connected with in the volunteer community
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingFriends ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : friends.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No friends yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start connecting with other volunteers to grow your network
                  </p>
                  <Button onClick={() => setTab('search')}>
                    <Search className="h-4 w-4 mr-2" />
                    Find Volunteers
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {friends.map((f) => (
                    <div
                      key={f._id || f.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors group cursor-pointer"
                      onClick={() => handleUserClick(f.username)}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <Avatar className="h-12 w-12 border-2 border-primary/20">
                          <AvatarImage src={f.profilePicture} />
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {(f.username || f.name || '?')[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-base truncate">{f.name || f.username}</div>
                          <div className="text-sm text-muted-foreground truncate">@{f.username}</div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnfriend(f._id || f.id || f.username);
                        }}
                      >
                        <UserX className="h-4 w-4 mr-2" />
                        Unfriend
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Requests Tab */}
        <TabsContent value="requests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                Friend Requests
              </CardTitle>
              <CardDescription>
                People who want to connect with you
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingRequests ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-9 w-20" />
                    </div>
                  ))}
                </div>
              ) : requests.length === 0 ? (
                <div className="text-center py-12">
                  <UserPlus className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No pending requests</h3>
                  <p className="text-muted-foreground">
                    You don't have any friend requests at the moment
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {requests.map((r) => (
                    <div
                      key={r._id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors group"
                    >
                      <div
                        className="flex items-center gap-3 flex-1 cursor-pointer"
                        onClick={() => handleUserClick(r.sender.username)}
                      >
                        <Avatar className="h-12 w-12 border-2 border-primary/20">
                          <AvatarImage src={r.sender.profilePicture} />
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {r.sender.username[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-base truncate">{r.sender.name || r.sender.username}</div>
                          <div className="text-sm text-muted-foreground truncate">@{r.sender.username}</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleAccept(r._id)}
                          disabled={acceptingId === r._id}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          {acceptingId === r._id ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Accepting...
                            </>
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-2" />
                              Accept
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(r._id)}
                          disabled={rejectingId === r._id}
                          className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive"
                        >
                          {rejectingId === r._id ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Declining...
                            </>
                          ) : (
                            <>
                              <X className="h-4 w-4 mr-2" />
                              Decline
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sent Tab */}
        <TabsContent value="sent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-primary" />
                Sent Requests
              </CardTitle>
              <CardDescription>
                Friend requests you've sent that are pending
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingSent ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-9 w-20" />
                    </div>
                  ))}
                </div>
              ) : sentRequests.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No sent requests</h3>
                  <p className="text-muted-foreground">
                    You haven't sent any friend requests yet
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sentRequests.map((r) => (
                    <div
                      key={r._id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors group"
                    >
                      <div
                        className="flex items-center gap-3 flex-1 cursor-pointer"
                        onClick={() => handleUserClick(r.receiver.username)}
                      >
                        <Avatar className="h-12 w-12 border-2 border-muted">
                          <AvatarImage src={r.receiver.profilePicture} />
                          <AvatarFallback className="bg-muted text-muted-foreground font-semibold">
                            {r.receiver.username[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-base truncate">{r.receiver.name || r.receiver.username}</div>
                          <div className="text-sm text-muted-foreground truncate flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            @{r.receiver.username} • Pending
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive"
                        onClick={() => handleCancelRequest(r._id)}
                        disabled={cancellingId === r._id}
                      >
                        {cancellingId === r._id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Cancelling...
                          </>
                        ) : (
                          <>
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Search Tab */}
        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" />
                Find Volunteers
              </CardTitle>
              <CardDescription>
                Search for volunteers by username or name
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by username or name..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-9 w-24" />
                    </div>
                  ))}
                </div>
              ) : results.length === 0 ? (
                <div className="text-center py-12">
                  <Search className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    {query ? 'No results found' : 'Start searching'}
                  </h3>
                  <p className="text-muted-foreground">
                    {query
                      ? 'Try different keywords or check the spelling'
                      : 'Enter a username or name to find volunteers'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {results.map((u) => (
                    <div
                      key={u._id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer group"
                      onClick={() => handleUserClick(u.username)}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <Avatar className="h-12 w-12 border-2 border-muted">
                          <AvatarImage src={u.profilePicture} />
                          <AvatarFallback className="bg-muted text-muted-foreground font-semibold">
                            {u.username[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-base truncate">{u.name || u.username}</div>
                          <div className="text-sm text-muted-foreground truncate">@{u.username}</div>
                        </div>
                      </div>
                      <div onClick={(e) => e.stopPropagation()}>
                        {u.relation === 'friends' && (
                          <Badge variant="secondary" className="gap-1 flex items-center">
                            <Check className="h-3 w-3" />
                            Friends
                          </Badge>
                        )}
                        {u.relation === 'pending_sent' && (
                          <Badge variant="outline" className="gap-1 flex items-center">
                            <Clock className="h-3 w-3" />
                            Pending
                          </Badge>
                        )}
                        {u.relation === 'pending_received' && (
                          <Badge variant="outline" className="gap-1 flex items-center">
                            <UserPlus className="h-3 w-3" />
                            Requested you
                          </Badge>
                        )}
                        {(!u.relation || u.relation === 'none') && user && user._id !== u._id && (
                          <Button
                            size="sm"
                            onClick={() => handleSend(u._id)}
                            disabled={sendingToId === u._id}
                          >
                            {sendingToId === u._id ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              <>
                                <UserPlus className="h-4 w-4 mr-2" />
                                Add Friend
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
