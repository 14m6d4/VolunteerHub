import { useEffect, useState } from 'react';
import apiFetch from '@/services/api';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

export default function AdminReportsPage() {
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>("all");

    const fetchReports = async () => {
        setLoading(true);
        try {
            // Build query string
            let qs = "";
            if (filterStatus && filterStatus !== "all") {
                qs = `?status=${filterStatus}`;
            }

            const data = await apiFetch(`/report/admin/all${qs}`);
            setReports(data || []);
        } catch (error) {
            console.error("Failed to fetch reports", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, [filterStatus]);

    const handleResolve = async (id: string, status: 'resolved' | 'rejected') => {
        try {
            await apiFetch(`/report/report/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ status })
            });
            // Refresh list
            fetchReports();
        } catch (error) {
            alert("Failed to update status");
        }
    };

    return (
        <div className="container mx-auto py-10 px-4 md:px-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Report Management</h1>
                <div className="w-[200px]">
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger>
                            <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Reports</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Reporter</TableHead>
                                <TableHead>Target Type</TableHead>
                                <TableHead>Reason</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-10">Loading...</TableCell>
                                </TableRow>
                            ) : reports.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-10">No reports found</TableCell>
                                </TableRow>
                            ) : (
                                reports.map((report) => (
                                    <TableRow key={report._id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={report.reporter?.profilePicture} />
                                                    <AvatarFallback>{report.reporter?.username?.[0]}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{report.reporter?.name || report.reporter?.username}</span>
                                                    <span className="text-xs text-muted-foreground">{report.reporter?.email}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="capitalize">
                                                {report.targetType}
                                            </Badge>
                                            {report.targetType === 'user' && (
                                                <div className="mt-1">
                                                    <Link to={`/u/${encodeURIComponent(report.targetId)}`} className="text-xs text-blue-500 hover:underline">
                                                        View Target ID: {report.targetId.substring(0, 8)}...
                                                    </Link>
                                                    {/* Note: Ideally we populate target too, but for mixed types we might just link by ID or fetch details separately */}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{report.reason}</div>
                                            {report.description && (
                                                <div className="text-sm text-muted-foreground max-w-[300px] truncate" title={report.description}>
                                                    {report.description}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={
                                                report.status === 'pending' ? 'secondary' :
                                                    report.status === 'resolved' ? 'default' : 'destructive'
                                            } className={
                                                report.status === 'resolved' ? 'bg-green-600 hover:bg-green-700' : ''
                                            }>
                                                {report.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {report.status === 'pending' && (
                                                <div className="flex justify-end gap-2">
                                                    <Button size="sm" variant="outline" onClick={() => handleResolve(report._id, 'rejected')}>
                                                        Reject
                                                    </Button>
                                                    <Button size="sm" onClick={() => handleResolve(report._id, 'resolved')}>
                                                        Resolve
                                                    </Button>
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
