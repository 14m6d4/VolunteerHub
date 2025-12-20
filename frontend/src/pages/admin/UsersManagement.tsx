import { useState, useMemo } from 'react';
import { 
  Download, 
  Search, 
  MoreHorizontal, 
  ArrowUpDown,
  Pencil,
  Ban,
  Trash2,
  UserPlus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { mockUsers } from '@/data/admin-mock';
import type { MockUser } from '@/data/admin-mock';
import { toast } from 'sonner';

type SortField = 'fullName' | 'username' | 'email' | null;
type SortOrder = 'asc' | 'desc';

export default function UsersManagement() {
  // State
  const [users, setUsers] = useState<MockUser[]>(mockUsers);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Dialog states
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [bulkActionDialogOpen, setBulkActionDialogOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<'ban' | 'delete' | null>(null);

  // Form state
  const [editingUser, setEditingUser] = useState<MockUser | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    role: 'volunteer' as 'volunteer' | 'manager',
    password: '',
    confirmPassword: '',
  });
  const [userToDelete, setUserToDelete] = useState<MockUser | null>(null);
  const [userToBan, setUserToBan] = useState<MockUser | null>(null);

  // Filtering and sorting logic
  const filteredAndSortedUsers = useMemo(() => {
    let result = [...users];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(user => 
        user.fullName.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(user => user.status === statusFilter);
    }

    // Apply role filter
    if (roleFilter !== 'all') {
      result = result.filter(user => user.role === roleFilter);
    }

    // Apply sorting
    if (sortField) {
      result.sort((a, b) => {
        const aValue = a[sortField].toLowerCase();
        const bValue = b[sortField].toLowerCase();
        if (sortOrder === 'asc') {
          return aValue.localeCompare(bValue);
        } else {
          return bValue.localeCompare(aValue);
        }
      });
    }

    return result;
  }, [users, searchQuery, statusFilter, roleFilter, sortField, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedUsers.length / rowsPerPage);
  const paginatedUsers = filteredAndSortedUsers.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // Handlers
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(new Set(paginatedUsers.map(u => u.id)));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedRows);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedRows(newSelected);
  };

  const openAddDialog = () => {
    setEditingUser(null);
    setFormData({
      fullName: '',
      username: '',
      email: '',
      role: 'volunteer',
      password: '',
      confirmPassword: '',
    });
    setUserDialogOpen(true);
  };

  const openEditDialog = (user: MockUser) => {
    setEditingUser(user);
    setFormData({
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      role: user.role,
      password: '',
      confirmPassword: '',
    });
    setUserDialogOpen(true);
  };

  const handleSaveUser = () => {
    if (!formData.fullName || !formData.username || !formData.email) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!editingUser && formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (editingUser) {
      // Edit existing user
      setUsers(users.map(u => 
        u.id === editingUser.id 
          ? { ...u, ...formData }
          : u
      ));
      toast.success('User updated successfully');
    } else {
      // Add new user
      const newUser: MockUser = {
        id: Date.now().toString(),
        fullName: formData.fullName,
        username: formData.username,
        email: formData.email,
        role: formData.role,
        status: 'active',
        createdAt: new Date().toISOString().split('T')[0],
      };
      setUsers([...users, newUser]);
      toast.success('User added successfully');
    }

    setUserDialogOpen(false);
  };

  const handleBanUser = () => {
    if (userToBan) {
      setUsers(users.map(u => 
        u.id === userToBan.id 
          ? { ...u, status: u.status === 'banned' ? 'active' : 'banned' as const }
          : u
      ));
      toast.success(`User ${userToBan.status === 'banned' ? 'unbanned' : 'banned'} successfully`);
      setUserToBan(null);
      setBanDialogOpen(false);
    }
  };

  const handleDeleteUser = () => {
    if (userToDelete) {
      setUsers(users.filter(u => u.id !== userToDelete.id));
      toast.success('User deleted successfully');
      setUserToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const handleBulkAction = () => {
    if (bulkAction === 'ban') {
      setUsers(users.map(u => 
        selectedRows.has(u.id) ? { ...u, status: 'banned' as const } : u
      ));
      toast.success(`${selectedRows.size} users banned successfully`);
    } else if (bulkAction === 'delete') {
      setUsers(users.filter(u => !selectedRows.has(u.id)));
      toast.success(`${selectedRows.size} users deleted successfully`);
    }
    setSelectedRows(new Set());
    setBulkActionDialogOpen(false);
  };

  const handleExport = (format: 'csv' | 'json') => {
    const dataToExport = filteredAndSortedUsers.map(({ id, ...rest }) => rest);
    
    if (format === 'csv') {
      const headers = Object.keys(dataToExport[0]).join(',');
      const rows = dataToExport.map(row => Object.values(row).join(','));
      const csv = [headers, ...rows].join('\n');
      downloadFile(csv, 'users.csv', 'text/csv');
    } else {
      const json = JSON.stringify(dataToExport, null, 2);
      downloadFile(json, 'users.json', 'application/json');
    }
    
    setExportDialogOpen(false);
    toast.success(`Exported as ${format.toUpperCase()}`);
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User list</h1>
          <p className="text-muted-foreground">Manage your users and their roles here.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setExportDialogOpen(true)}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={openAddDialog}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by full name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="banned">Banned</SelectItem>
            </SelectContent>
          </Select>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="volunteer">Volunteer</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedRows.size > 0 && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3">
          <span className="text-sm font-medium">{selectedRows.size} selected</span>
          <div className="flex gap-2 ml-auto">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setBulkAction('ban');
                setBulkActionDialogOpen(true);
              }}
            >
              <Ban className="mr-2 h-4 w-4" />
              Ban Selected
            </Button>
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => {
                setBulkAction('delete');
                setBulkActionDialogOpen(true);
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Selected
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={paginatedUsers.length > 0 && selectedRows.size === paginatedUsers.length}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="-ml-3 h-8"
                  onClick={() => handleSort('fullName')}
                >
                  Full Name
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="-ml-3 h-8"
                  onClick={() => handleSort('username')}
                >
                  Username
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="-ml-3 h-8"
                  onClick={() => handleSort('email')}
                >
                  Email
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              paginatedUsers.map((user) => (
                <TableRow key={user.id} data-state={selectedRows.has(user.id) ? 'selected' : undefined}>
                  <TableCell>
                    <Checkbox
                      checked={selectedRows.has(user.id)}
                      onCheckedChange={(checked) => handleSelectRow(user.id, !!checked)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{user.fullName}</TableCell>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={user.status === 'active' ? 'default' : 'destructive'}>
                      {user.status === 'active' ? 'Active' : 'Banned'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(user)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => {
                            setUserToBan(user);
                            setBanDialogOpen(true);
                          }}
                        >
                          <Ban className="mr-2 h-4 w-4" />
                          {user.status === 'banned' ? 'Unban' : 'Ban'}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          variant="destructive"
                          onClick={() => {
                            setUserToDelete(user);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page:</span>
          <Select value={rowsPerPage.toString()} onValueChange={(v) => { setRowsPerPage(Number(v)); setCurrentPage(1); }}>
            <SelectTrigger className="w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages || 1}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Users</DialogTitle>
            <DialogDescription>
              Choose the format to export user data.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-4">
            <Button variant="outline" onClick={() => handleExport('csv')} className="justify-start">
              <Download className="mr-2 h-4 w-4" />
              Export as CSV
            </Button>
            <Button variant="outline" onClick={() => handleExport('json')} className="justify-start">
              <Download className="mr-2 h-4 w-4" />
              Export as JSON
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit User Dialog */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit User' : 'Add User'}</DialogTitle>
            <DialogDescription>
              {editingUser ? 'Update user information below.' : 'Fill in the details to add a new user.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="johndoe"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Select value={formData.role} onValueChange={(v: 'volunteer' | 'manager') => setFormData({ ...formData, role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="volunteer">Volunteer</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={editingUser ? 'Leave blank to keep current' : '••••••••'}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="••••••••"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveUser}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{userToDelete?.fullName}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Ban Confirmation Dialog */}
      <AlertDialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{userToBan?.status === 'banned' ? 'Unban' : 'Ban'} User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {userToBan?.status === 'banned' ? 'unban' : 'ban'} <strong>{userToBan?.fullName}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBanUser}>
              {userToBan?.status === 'banned' ? 'Unban' : 'Ban'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Action Confirmation Dialog */}
      <AlertDialog open={bulkActionDialogOpen} onOpenChange={setBulkActionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkAction === 'ban' ? 'Ban Selected Users' : 'Delete Selected Users'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {bulkAction} {selectedRows.size} selected users? 
              {bulkAction === 'delete' && ' This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkAction}
              className={bulkAction === 'delete' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {bulkAction === 'ban' ? 'Ban All' : 'Delete All'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
