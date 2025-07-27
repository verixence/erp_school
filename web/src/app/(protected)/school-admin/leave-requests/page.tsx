'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import {
  useSchoolLeaveRequests,
  useUpdateLeaveRequestStatus,
  useLeaveStatistics,
  getLeaveTypeDisplayName,
  getStatusColor,
  type LeaveRequest,
  type UpdateLeaveRequestData
} from '@erp/common';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Calendar, Clock, User, FileText, CheckCircle, XCircle, Loader2, Eye, Check, X, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function SchoolAdminLeaveRequestsPage() {
  const { user } = useAuth();
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approved' | 'rejected'>('approved');
  const [adminResponse, setAdminResponse] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // Queries and mutations
  const { data: leaveRequests = [], isLoading } = useSchoolLeaveRequests(user?.school_id || undefined);
  const { data: statistics } = useLeaveStatistics(user?.school_id || undefined);
  const updateStatusMutation = useUpdateLeaveRequestStatus();

  // Filter requests based on status
  const filteredRequests = leaveRequests.filter(request => {
    if (statusFilter === 'all') return true;
    return request.status === statusFilter;
  });

  // Handle approval/rejection
  const handleReviewSubmit = async () => {
    if (!selectedRequest) return;

    const updateData: UpdateLeaveRequestData = {
      status: reviewAction,
      admin_response: adminResponse.trim() || undefined
    };

    try {
      await updateStatusMutation.mutateAsync({
        id: selectedRequest.id,
        data: updateData
      });
      
      toast.success(`Leave request ${reviewAction} successfully!`);
      setIsReviewDialogOpen(false);
      setIsDetailDialogOpen(false);
      setSelectedRequest(null);
      setAdminResponse('');
    } catch (error: any) {
      toast.error(`Failed to ${reviewAction} leave request: ` + error.message);
    }
  };

  // Quick approve/reject handlers
  const handleQuickApprove = async (request: LeaveRequest) => {
    try {
      await updateStatusMutation.mutateAsync({
        id: request.id,
        data: { status: 'approved' }
      });
      toast.success('Leave request approved!');
    } catch (error: any) {
      toast.error('Failed to approve leave request: ' + error.message);
    }
  };

  const handleQuickReject = async (request: LeaveRequest) => {
    try {
      await updateStatusMutation.mutateAsync({
        id: request.id,
        data: { status: 'rejected' }
      });
      toast.success('Leave request rejected!');
    } catch (error: any) {
      toast.error('Failed to reject leave request: ' + error.message);
    }
  };

  const openDetailDialog = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setIsDetailDialogOpen(true);
  };

  const openReviewDialog = (request: LeaveRequest, action: 'approved' | 'rejected') => {
    setSelectedRequest(request);
    setReviewAction(action);
    setAdminResponse('');
    setIsReviewDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leave Requests</h1>
          <p className="text-muted-foreground">
            Review and manage teacher leave requests
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Requests</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.pending_requests}</div>
              <p className="text-xs text-muted-foreground">Awaiting your review</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.approved_requests}</div>
              <p className="text-xs text-muted-foreground">This year</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rejected</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.rejected_requests}</div>
              <p className="text-xs text-muted-foreground">This year</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Days Approved</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.total_days_approved}</div>
              <p className="text-xs text-muted-foreground">Total days this year</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Leave Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Teacher Leave Requests</CardTitle>
          <CardDescription>
            Review, approve, or reject leave requests from teachers
            {statusFilter !== 'all' && (
              <span className="ml-2">
                • Showing {statusFilter} requests ({filteredRequests.length})
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredRequests.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {statusFilter === 'all' ? 'No leave requests' : `No ${statusFilter} requests`}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {statusFilter === 'all' 
                  ? 'Teachers haven\'t submitted any leave requests yet.'
                  : `There are no ${statusFilter} leave requests to show.`
                }
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Leave Type</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <div>
                          <div className="font-medium">
                            {request.teacher ? 
                              `${request.teacher.first_name} ${request.teacher.last_name}` : 
                              'Unknown Teacher'
                            }
                          </div>
                          <div className="text-sm text-gray-500">{request.teacher?.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{getLeaveTypeDisplayName(request.leave_type)}</div>
                        <div className="text-sm text-gray-500 max-w-[200px] truncate">
                          {request.reason}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{format(new Date(request.start_date), 'MMM dd, yyyy')}</div>
                        <div className="text-gray-500">to {format(new Date(request.end_date), 'MMM dd, yyyy')}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{request.total_days} days</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(request.status)} variant="outline">
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {format(new Date(request.created_at), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDetailDialog(request)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        {request.status === 'pending' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => openReviewDialog(request, 'approved')}
                              disabled={updateStatusMutation.isPending}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost" 
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => openReviewDialog(request, 'rejected')}
                              disabled={updateStatusMutation.isPending}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        
                        {request.admin_response && (
                          <div className="text-xs bg-blue-100 px-2 py-1 rounded max-w-[150px] truncate" title={request.admin_response}>
                            Note: {request.admin_response}
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Leave Request Details</DialogTitle>
            <DialogDescription>
              Review the complete leave request information
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-6">
              {/* Header with status */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <User className="h-8 w-8 text-gray-400" />
                  <div>
                    <h3 className="font-medium">
                      {selectedRequest.teacher ? 
                        `${selectedRequest.teacher.first_name} ${selectedRequest.teacher.last_name}` : 
                        'Unknown Teacher'
                      }
                    </h3>
                    <p className="text-sm text-gray-500">{selectedRequest.teacher?.email}</p>
                  </div>
                </div>
                <Badge className={getStatusColor(selectedRequest.status)} variant="outline">
                  {selectedRequest.status.charAt(0).toUpperCase() + selectedRequest.status.slice(1)}
                </Badge>
              </div>

              {/* Leave Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Leave Type</Label>
                  <p className="mt-1">{getLeaveTypeDisplayName(selectedRequest.leave_type)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Total Days</Label>
                  <p className="mt-1">{selectedRequest.total_days} days</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Start Date</Label>
                  <p className="mt-1">{format(new Date(selectedRequest.start_date), 'EEEE, MMMM dd, yyyy')}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">End Date</Label>
                  <p className="mt-1">{format(new Date(selectedRequest.end_date), 'EEEE, MMMM dd, yyyy')}</p>
                </div>
              </div>

              {/* Reason */}
              <div>
                <Label className="text-sm font-medium text-gray-700">Reason</Label>
                <div className="mt-1 p-3 bg-gray-50 rounded-md">
                  <p className="text-sm">{selectedRequest.reason}</p>
                </div>
              </div>

              {/* Admin Response */}
              {selectedRequest.admin_response && (
                <div>
                  <Label className="text-sm font-medium text-gray-700">Admin Response</Label>
                  <div className="mt-1 p-3 bg-blue-50 rounded-md">
                    <p className="text-sm">{selectedRequest.admin_response}</p>
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Submitted</Label>
                  <p className="mt-1 text-sm">{format(new Date(selectedRequest.created_at), 'MMM dd, yyyy • hh:mm a')}</p>
                </div>
                {selectedRequest.reviewed_at && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Reviewed</Label>
                    <p className="mt-1 text-sm">{format(new Date(selectedRequest.reviewed_at), 'MMM dd, yyyy • hh:mm a')}</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {selectedRequest.status === 'pending' && (
                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => openReviewDialog(selectedRequest, 'rejected')}
                    disabled={updateStatusMutation.isPending}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Reject
                  </Button>
                  <Button
                    onClick={() => openReviewDialog(selectedRequest, 'approved')}
                    disabled={updateStatusMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Approve
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'approved' ? 'Approve' : 'Reject'} Leave Request
            </DialogTitle>
            <DialogDescription>
              {reviewAction === 'approved' 
                ? 'Approve this leave request. You can optionally add a note for the teacher.'
                : 'Reject this leave request. Please provide a reason for rejection.'
              }
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              {/* Request Summary */}
              <div className="p-3 bg-gray-50 rounded-md">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">
                      {selectedRequest.teacher ? 
                        `${selectedRequest.teacher.first_name} ${selectedRequest.teacher.last_name}` : 
                        'Unknown Teacher'
                      }
                    </p>
                    <p className="text-sm text-gray-600">
                      {getLeaveTypeDisplayName(selectedRequest.leave_type)} • {selectedRequest.total_days} days
                    </p>
                    <p className="text-sm text-gray-600">
                      {format(new Date(selectedRequest.start_date), 'MMM dd')} - {format(new Date(selectedRequest.end_date), 'MMM dd, yyyy')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Admin Response */}
              <div>
                <Label htmlFor="admin_response">
                  {reviewAction === 'approved' ? 'Note (Optional)' : 'Reason for Rejection'}
                </Label>
                <Textarea
                  id="admin_response"
                  placeholder={
                    reviewAction === 'approved' 
                      ? 'Add a note for the teacher (optional)...'
                      : 'Please provide a reason for rejecting this leave request...'
                  }
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  rows={3}
                  className="mt-1"
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsReviewDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleReviewSubmit}
                  disabled={updateStatusMutation.isPending}
                  className={reviewAction === 'approved' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                  }
                >
                  {updateStatusMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      {reviewAction === 'approved' ? (
                        <Check className="mr-2 h-4 w-4" />
                      ) : (
                        <X className="mr-2 h-4 w-4" />
                      )}
                      {reviewAction === 'approved' ? 'Approve' : 'Reject'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 