import { useState } from 'react';
import { Check, X, UserCheck, UserPlus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import type { Event } from '@/types/event';

interface ManageMembersModalProps {
  event: Event | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRemoveMember: (userId: string) => void;
  onApproveRequest: (userId: string) => void;
  onRejectRequest: (userId: string) => void;
  onApproveAll: () => void;
  onRejectAll: () => void;
}

const ITEMS_PER_PAGE = 5;

export const ManageMembersModal = ({
  event,
  open,
  onOpenChange,
  onRemoveMember,
  onApproveRequest,
  onRejectRequest,
  onApproveAll,
  onRejectAll,
}: ManageMembersModalProps) => {
  const [membersPage, setMembersPage] = useState(1);
  const [requestsPage, setRequestsPage] = useState(1);

  if (!event) return null;

  const members = event.members || [];
  const requests = event.requests || [];

  // Pagination logic for members
  const membersTotalPages = Math.ceil(members.length / ITEMS_PER_PAGE);
  const membersStartIndex = (membersPage - 1) * ITEMS_PER_PAGE;
  const membersEndIndex = membersStartIndex + ITEMS_PER_PAGE;
  const paginatedMembers = members.slice(membersStartIndex, membersEndIndex);

  // Pagination logic for requests
  const requestsTotalPages = Math.ceil(requests.length / ITEMS_PER_PAGE);
  const requestsStartIndex = (requestsPage - 1) * ITEMS_PER_PAGE;
  const requestsEndIndex = requestsStartIndex + ITEMS_PER_PAGE;
  const paginatedRequests = requests.slice(requestsStartIndex, requestsEndIndex);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-10xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Manage Members - {event.title}
          </DialogTitle>
          <DialogDescription>
            Manage event members and review pending membership requests.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="members" className="w-full flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="members">
              Members ({members.length})
            </TabsTrigger>
            <TabsTrigger value="requests">
              Pending Requests ({requests.length})
            </TabsTrigger>
          </TabsList>

          {/* Members Tab */}
          <TabsContent value="members" className="space-y-4 flex-1 overflow-auto">
            {members.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <UserCheck className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No members yet</p>
              </div>
            ) : (
              <>
                <div className="rounded-md border overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead className="min-w-[150px]">Name</TableHead>
                        <TableHead className="min-w-[120px]">Username</TableHead>
                        <TableHead className="min-w-[200px]">Email</TableHead>
                        <TableHead className="text-right min-w-[120px]">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedMembers.map((member, index) => (
                        <TableRow key={member.id}>
                          <TableCell className="font-medium">
                            {membersStartIndex + index + 1}
                          </TableCell>
                          <TableCell className="font-medium">{member.name}</TableCell>
                          <TableCell className="text-muted-foreground">@{member.username}</TableCell>
                          <TableCell className="text-sm">{member.email}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onRemoveMember(member.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <X className="h-4 w-4 mr-1" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {membersTotalPages > 1 && (
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setMembersPage(prev => Math.max(1, prev - 1))}
                          className={membersPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                      {Array.from({ length: membersTotalPages }, (_, i) => i + 1).map(page => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => setMembersPage(page)}
                            isActive={page === membersPage}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => setMembersPage(prev => Math.min(membersTotalPages, prev + 1))}
                          className={membersPage === membersTotalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </>
            )}
          </TabsContent>

          {/* Pending Requests Tab */}
          <TabsContent value="requests" className="space-y-4 flex-1 overflow-auto">
            {requests.length > 0 && (
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={onRejectAll}>
                  <X className="h-4 w-4 mr-1" />
                  Reject All
                </Button>
                <Button size="sm" onClick={onApproveAll}>
                  <Check className="h-4 w-4 mr-1" />
                  Approve All
                </Button>
              </div>
            )}

            {requests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <UserPlus className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No pending requests</p>
              </div>
            ) : (
              <>
                <div className="rounded-md border overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead className="min-w-[150px]">Name</TableHead>
                        <TableHead className="min-w-[120px]">Username</TableHead>
                        <TableHead className="min-w-[200px]">Email</TableHead>
                        <TableHead className="text-right min-w-[150px]">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedRequests.map((user, index) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            {requestsStartIndex + index + 1}
                          </TableCell>
                          <TableCell className="font-medium">{user.name}</TableCell>
                          <TableCell className="text-muted-foreground">@{user.username}</TableCell>
                          <TableCell className="text-sm">{user.email}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onRejectRequest(user.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onApproveRequest(user.id)}
                                className="text-green-600 hover:text-green-700"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {requestsTotalPages > 1 && (
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setRequestsPage(prev => Math.max(1, prev - 1))}
                          className={requestsPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                      {Array.from({ length: requestsTotalPages }, (_, i) => i + 1).map(page => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => setRequestsPage(page)}
                            isActive={page === requestsPage}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => setRequestsPage(prev => Math.min(requestsTotalPages, prev + 1))}
                          className={requestsPage === requestsTotalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
