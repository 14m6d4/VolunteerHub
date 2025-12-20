import { useState, useMemo, useEffect } from 'react';
import {
  Search,
  X,
  Check,
  Download
} from 'lucide-react';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { formatDistanceToNow } from 'date-fns';
import { mockReports } from '@/data/admin-mock';
import type { MockReport } from '@/data/admin-mock';

export default function ReportsManagement() {
  // State
  const [reports, setReports] = useState<(MockReport & { targetDetails?: any })[]>([]);
  const [loading, setLoading] = useState(true);
  const [useMockData, setUseMockData] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Dialog states
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [reportToReject, setReportToReject] = useState<MockReport | null>(null);
  const [reportToResolve, setReportToResolve] = useState<MockReport | null>(null);

  // Fetch reports from API or use mock data
  const fetchReports = async () => {
    setLoading(true);
    try {
      let qs = "";
      if (statusFilter && statusFilter !== "all") {
        qs = `?status=${statusFilter}`;
      }
      const data = await apiFetch(`/report/admin/all${qs}`);

      // Transform API data to match our interface
      const transformedData: MockReport[] = (data || []).map((report: any) => ({
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
        targetUsername: report.targetType === 'user' ? report.targetId : undefined,
        targetDetails: report.targetDetails, // Include target details from backend
        reason: report.reason,
        description: report.description,
        status: report.status,
        createdAt: report.createdAt,
      }));

      setReports(transformedData);
      setUseMockData(false);
    } catch (error) {
      console.error("Failed to fetch reports, using mock data", error);
      setReports(mockReports);
      setUseMockData(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [statusFilter]);

  // Filtering logic
  const filteredReports = useMemo(() => {
    let result = [...reports];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(report =>
        report.reporter.name.toLowerCase().includes(query) ||
        report.reporter.username.toLowerCase().includes(query) ||
        report.reason.toLowerCase().includes(query)
      );
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      result = result.filter(report => report.targetType === typeFilter);
    }

    // Apply status filter (for mock data, since API handles it)
    if (useMockData && statusFilter !== 'all') {
      result = result.filter(report => report.status === statusFilter);
    }

    return result;
  }, [reports, searchQuery, typeFilter, statusFilter, useMockData]);

  // Pagination
  const totalPages = Math.ceil(filteredReports.length / rowsPerPage);
  const paginatedReports = filteredReports.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // Handlers
  const handleResolve = async () => {
    if (!reportToResolve) return;

    if (useMockData) {
      setReports(reports.map(r =>
        r.id === reportToResolve.id ? { ...r, status: 'resolved' as const } : r
      ));
      toast.success('Report resolved successfully');
    } else {
      try {
        await apiFetch(`/report/${reportToResolve.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'resolved' })
        });
        fetchReports();
        toast.success('Report resolved successfully');
      } catch (error) {
        toast.error('Failed to resolve report');
      }
    }

    setReportToResolve(null);
    setResolveDialogOpen(false);
  };

  const handleReject = async () => {
    if (!reportToReject) return;

    if (useMockData) {
      setReports(reports.map(r =>
        r.id === reportToReject.id ? { ...r, status: 'rejected' as const } : r
      ));
      toast.success('Report rejected successfully');
    } else {
      try {
        await apiFetch(`/report/${reportToReject.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'rejected' })
        });
        fetchReports();
        toast.success('Report rejected successfully');
      } catch (error) {
        toast.error('Failed to reject report');
      }
    }

    setReportToReject(null);
    setRejectDialogOpen(false);
  };

  const handleExport = (format: 'csv' | 'json') => {
    const dataToExport = filteredReports.map(({ id, ...rest }) => ({
      ...rest,
      reporter: rest.reporter.username,
    }));

    if (format === 'csv') {
      const headers = ['reporter', 'targetType', 'targetId', 'reason', 'description', 'status', 'createdAt'];
      const rows = dataToExport.map(row =>
        headers.map(h => {
          const val = (row as any)[h];
          return typeof val === 'string' && val.includes(',') ? `"${val}"` : val || '';
        }).join(',')
      );
      const csv = [headers.join(','), ...rows].join('\n');
      downloadFile(csv, 'reports.csv', 'text/csv');
    } else {
      const json = JSON.stringify(dataToExport, null, 2);
      downloadFile(json, 'reports.json', 'application/json');
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

  const getTargetId = (report: MockReport) => {
    if (report.targetType === 'post') {
      return report.targetId.length > 12
        ? `${report.targetId.substring(0, 12)}...`
        : report.targetId;
    }
    return report.targetUsername || report.targetId;
  };

  const getTargetDisplay = (report: MockReport & { targetDetails?: any }) => {
    if (report.targetType === 'user' && report.targetDetails?.username) {
      return `@${report.targetDetails.username}`;
    } else if (report.targetType === 'event' && report.targetDetails?.title) {
      return report.targetDetails.title.length > 30
        ? `${report.targetDetails.title.substring(0, 30)}...`
        : report.targetDetails.title;
    } else if (report.targetType === 'post') {
      return report.targetId.length > 12
        ? `${report.targetId.substring(0, 12)}...`
        : report.targetId;
    }
    return report.targetId;
  };

  const getTargetLink = (report: MockReport & { targetDetails?: any }) => {
    if (report.targetType === 'user' && report.targetDetails?.username) {
      return `/u/${report.targetDetails.username}`;
    } else if (report.targetType === 'event') {
      return `/events/${report.targetId}`;
    } else if (report.targetType === 'post') {
      return `/feed`;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Report Management</h1>
          <p className="text-muted-foreground">Review and manage user reports.</p>
        </div>
        <Button variant="outline" onClick={() => setExportDialogOpen(true)}>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by reporter, reason..."
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
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="post">Post</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reporter</TableHead>
              <TableHead>Target Type</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : paginatedReports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No reports found.
                </TableCell>
              </TableRow>
            ) : (
              paginatedReports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={report.reporter.profilePicture} />
                        <AvatarFallback>{report.reporter.username?.[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{report.reporter.name}</span>
                        <span className="text-xs text-muted-foreground">{report.reporter.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {report.targetType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {getTargetLink(report) ? (
                      <a
                        href={getTargetLink(report)!}
                        className="text-xs bg-muted px-1.5 py-0.5 rounded hover:bg-muted/80 transition-colors inline-block"
                        onClick={(e) => {
                          e.preventDefault();
                          window.location.href = getTargetLink(report)!;
                        }}
                      >
                        {getTargetDisplay(report)}
                      </a>
                    ) : (
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {getTargetDisplay(report)}
                      </code>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[200px]">
                      <p className="font-medium text-sm">{report.reason}</p>
                      {report.description && (
                        <p className="text-xs text-muted-foreground truncate" title={report.description}>
                          {report.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(report.status)} className="capitalize">
                      {report.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}
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
            <DialogTitle>Export Reports</DialogTitle>
            <DialogDescription>
              Choose the format to export report data.
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

      {/* Reject Confirmation Dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Report</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject this report from <strong>{reportToReject?.reporter.name}</strong>?
              This indicates the report is not valid.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReject} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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
              Are you sure you want to resolve this report from <strong>{reportToResolve?.reporter.name}</strong>?
              This indicates appropriate action has been taken.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResolve}>
              Resolve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
