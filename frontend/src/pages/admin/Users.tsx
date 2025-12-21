import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, Ban, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface User {
    _id: string;
    username: string;
    name?: string;
    profilePicture?: string;
    role: string;
    isBanned: boolean;
    bannedReason?: string;
    email?: string;
}

export default function AdminUsersPage() {
    const [query, setQuery] = useState("");
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [bannedUsers, setBannedUsers] = useState<User[]>([]);
    const [loadingSearch, setLoadingSearch] = useState(false);
    const [loadingBanned, setLoadingBanned] = useState(false);

    useEffect(() => {
        fetchBannedUsers();
    }, []);

    const fetchBannedUsers = async () => {
        setLoadingBanned(true);
        try {
            const res = await apiFetch('/users/admin/banned');
            setBannedUsers(res.data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch banned users");
        } finally {
            setLoadingBanned(false);
        }
    };

    const handleSearch = async () => {
        if (!query.trim()) return;
        setLoadingSearch(true);
        try {
            const res = await apiFetch(`/users/admin/search?q=${encodeURIComponent(query)}`);
            setSearchResults(res.data);
        } catch (error) {
            console.error(error);
            toast.error("Search failed");
        } finally {
            setLoadingSearch(false);
        }
    };

    const handleBan = async (user: User) => {
        if (!confirm(`Are you sure you want to ban ${user.username}?`)) return;
        try {
            await apiFetch(`/users/admin/ban/${user._id || (user as any).id}`, {
                method: 'POST',
                body: JSON.stringify({ reason: 'Admin manual ban' })
            });
            toast.success(`User ${user.username} banned`);
            // Refresh lists
            fetchBannedUsers();
            if (searchResults.find(u => u._id === user._id || (u as any).id === (user as any).id)) {
                handleSearch();
            }
        } catch (error: any) {
            toast.error(error.message || "Ban failed");
        }
    };

    const handleUnban = async (user: User) => {
        if (!confirm(`Unban ${user.username}?`)) return;
        try {
            await apiFetch(`/users/admin/unban/${user._id || (user as any).id}`, { method: 'POST' });
            toast.success(`User ${user.username} unbanned`);
            fetchBannedUsers();
            if (searchResults.find(u => u._id === user._id || (u as any).id === (user as any).id)) {
                handleSearch();
            }
        } catch (error: any) {
            toast.error(error.message || "Unban failed");
        }
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* LEFT COLUMN: SEARCH */}
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Search Users</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-2 mb-4">
                                <Input
                                    placeholder="Search by username, name, email..."
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                />
                                <Button onClick={handleSearch} disabled={loadingSearch}>
                                    <Search className="w-4 h-4 mr-2" />
                                    Search
                                </Button>
                            </div>

                            <div className="space-y-2">
                                {loadingSearch && <div className="text-muted-foreground text-center">Searching...</div>}
                                {!loadingSearch && searchResults.length === 0 && query && (
                                    <div className="text-muted-foreground text-center">No results found</div>
                                )}
                                {searchResults.map(user => (
                                    <UserRow
                                        key={user._id || (user as any).id}
                                        user={user}
                                        onBan={() => handleBan(user)}
                                        onUnban={() => handleUnban(user)}
                                    />
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* RIGHT COLUMN: BANNED USERS */}
                <div className="space-y-4">
                    <Card className="border-destructive/50">
                        <CardHeader>
                            <CardTitle className="text-destructive flex items-center gap-2">
                                <Ban className="w-5 h-5" />
                                Banned Users
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {loadingBanned && <div>Loading...</div>}
                                {!loadingBanned && bannedUsers.length === 0 && (
                                    <div className="text-muted-foreground">No banned users.</div>
                                )}
                                {bannedUsers.map(user => (
                                    <UserRow
                                        key={user._id || (user as any).id}
                                        user={user}
                                        onBan={() => handleBan(user)}
                                        onUnban={() => handleUnban(user)}
                                    />
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function UserRow({ user, onBan, onUnban }: { user: User, onBan: () => void, onUnban: () => void }) {
    const userId = user._id || (user as any).id;
    return (
        <div className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-accent/5 transition-colors">
            <div className="flex items-center gap-3">
                <Avatar>
                    <AvatarImage src={user.profilePicture} />
                    <AvatarFallback>{user.username[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                    <div className="font-medium flex items-center gap-2">
                        {user.username}
                        {user.isBanned && <Badge variant="destructive" className="text-xs h-5">BANNED</Badge>}
                        {user.role === 'admin' && <Badge variant="secondary" className="text-xs h-5">ADMIN</Badge>}
                    </div>
                    <div className="text-sm text-muted-foreground">{user.name || user.email || "No name"}</div>
                </div>
            </div>

            <div className="flex gap-2">
                <Link to={`/u/${user.username}`}>
                    <Button variant="ghost" size="sm">View</Button>
                </Link>
                {user.isBanned ? (
                    <Button variant="outline" size="sm" onClick={onUnban} className="text-green-600 hover:text-green-700 hover:bg-green-50">
                        Unban
                    </Button>
                ) : (
                    <Button variant="ghost" size="sm" onClick={onBan} className="text-destructive hover:bg-destructive/10">
                        Ban
                    </Button>
                )}
            </div>
        </div>
    )
}
