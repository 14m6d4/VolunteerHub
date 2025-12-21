import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Check, FileWarning } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import apiFetch from '@/services/api';
import { toast } from 'sonner';

interface Reporter {
  id: string;
  username: string;
  name: string;
  email?: string;
  profilePicture?: string;
}

interface EventReport {
  id: string;
  reporter: Reporter;
  targetType: 'post';
  targetId: string;
  reason: string;
  description?: string;
  status: 'pending' | 'resolved' | 'rejected';
  createdAt: string;
}

interface EventReportsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
  onReportAction?: () => void;
}

export function EventReportsDialog({
  open,
  onOpenChange,
  eventId,
  eventTitle,
  onReportAction,
}: EventReportsDialogProps) {
  const navigate = useNavigate();
  const [reports, setReports] = useState<EventReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Dialog states for actions
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [reportToReject, setReportToReject] = useState<EventReport | null>(null);
  const [reportToResolve, setReportToResolve] = useState<EventReport | null>(null);

  // Fetch reports for this event
  const fetchReports = async () => {
    setLoading(true);
    try {
      // Get reports for posts in this specific event
      const data = await apiFetch(`/report/event/${eventId}/reports`);

      // Transform the data
      const transformedData: EventReport[] = (data || []).map((report: any) => ({
        id: report._id,
        reporter: {
          id: report.reporter?._id || report.reporter?.id || 'unknown',
          username: report.reporter?.username || 'unknown',
          name: report.reporter?.name || report.reporter?.username || 'Unknown',
          email: report.reporter?.email || '',
          profilePicture: report.reporter?.profilePicture,
        },
        targetType: report.targetType,
        targetId: report.targetId,
        reason: report.reason,
        description: report.description,
        status: report.status,
        createdAt: report.createdAt,
      }));

      // Apply status filter if needed
      const filtered = statusFilter && statusFilter !== 'all'
        ? transformedData.filter(r => r.status === statusFilter)
        : transformedData;

      setReports(filtered);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
      toast.error('Failed to load reports');
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchReports();
    }
  }, [open, statusFilter]);

  // Filtering logic
  const filteredReports = useMemo(() => {
    let result = [...reports];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (report) =>
          report.reporter.name.toLowerCase().includes(query) ||
          report.reporter.username.toLowerCase().includes(query) ||
          report.reason.toLowerCase().includes(query) ||
          report.targetId.toLowerCase().includes(query)
      );
    }

    return result;
  }, [reports, searchQuery]);

  // Handlers
  const handleResolve = async () => {
    if (!reportToResolve) return;

    try {
      await apiFetch(`/report/${reportToResolve.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'resolved' }),
      });
      fetchReports();
      toast.success('Report resolved successfully');
      onReportAction?.();
    } catch (error) {
      toast.error('Failed to resolve report');
    }

    setReportToResolve(null);
    setResolveDialogOpen(false);
  };

  const handleReject = async () => {
    if (!reportToReject) return;

    try {
      await apiFetch(`/report/${reportToReject.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'rejected' }),
      });
      fetchReports();
      toast.success('Report rejected successfully');
      onReportAction?.();
    } catch (error) {
      toast.error('Failed to reject report');
    }

    setReportToReject(null);
    setRejectDialogOpen(false);
  };

  const handlePostClick = (postId: string) => {
    onOpenChange(false);
    navigate(`/events/${eventId}/posts/${postId}`);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending':
        return 'default';
      case 'resolved':
        return 'secondary';
      case 'rejected':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const getPostIdDisplay = (postId: string) => {
    return postId.length > 12 ? `${postId.substring(0, 12)}...` : postId;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[1000px] max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileWarning className="h-5 w-5 text-orange-500" />
              Post Reports
            </DialogTitle>
            <DialogDescription>
              View and manage reports for posts in "{eventTitle}"
            </DialogDescription>
          </DialogHeader>

          {/* Filters */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center py-4 border-b">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by reporter, reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reporter</TableHead>
                  <TableHead>Post ID</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredReports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No reports found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={report.reporter.profilePicture} />
                            <AvatarFallback>
                              {report.reporter.username?.[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{report.reporter.name}</span>
                            <span className="text-xs text-muted-foreground">
                              @{report.reporter.username}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => handlePostClick(report.targetId)}
                          className="text-primary hover:underline font-mono text-xs bg-muted px-1.5 py-0.5 rounded cursor-pointer"
                        >
                          {getPostIdDisplay(report.targetId)}
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px]">
                          <p className="font-medium text-sm capitalize">{report.reason}</p>
                          {report.description && (
                            <p
                              className="text-xs text-muted-foreground truncate"
                              title={report.description}
                            >
                              {report.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={getStatusBadgeVariant(report.status)}
                          className="capitalize"
                        >
                          {report.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {report.status === 'pending' && (
                          <div className="flex justify-center gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => {
                                      setReportToReject(report);
                                      setRejectDialogOpen(true);
                                    }}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Reject</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-green-600 hover:text-green-600 hover:bg-green-600/10"
                                    onClick={() => {
                                      setReportToResolve(report);
                                      setResolveDialogOpen(true);
                                    }}
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Resolve</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Summary */}
          <div className="pt-4 border-t text-sm text-muted-foreground">
            Showing {filteredReports.length} report{filteredReports.length !== 1 ? 's' : ''}
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Confirmation Dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Report</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject this report from{' '}
              <strong>{reportToReject?.reporter.name}</strong>? This indicates the report is not
              valid.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Resolve Confirmation Dialog */}
      <AlertDialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resolve Report</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to resolve this report from{' '}
              <strong>{reportToResolve?.reporter.name}</strong>? This indicates appropriate action
              has been taken.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResolve}>Resolve</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
