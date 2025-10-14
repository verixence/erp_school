'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, Eye, FileText, DollarSign, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase-client';

// Helper to get auth headers
const getAuthHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session?.access_token}`,
  };
};

interface ExpenseClaim {
  id: string;
  employee_name: string;
  employee_id: string;
  department: string;
  claim_date: string;
  expense_date: string;
  expense_category: string;
  description: string;
  amount: number;
  receipt_url: string;
  receipt_file_name: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'paid';
  approved_amount: number;
  rejection_reason: string;
  review_notes: string;
  reviewed_at: string;
  payment_method: string;
  bank_account_number: string;
  bank_name: string;
  ifsc_code: string;
  users: {
    first_name: string;
    last_name: string;
    display_name: string;
    email: string;
  };
  reviewed_by_user?: {
    first_name: string;
    last_name: string;
    display_name: string;
  };
  created_at: string;
}

export default function AdminExpenseClaims({ schoolId }: { schoolId: string }) {
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedClaim, setSelectedClaim] = useState<ExpenseClaim | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  const [reviewForm, setReviewForm] = useState({
    status: 'approved',
    approved_amount: 0,
    rejection_reason: '',
    review_notes: ''
  });

  const [paymentForm, setPaymentForm] = useState({
    payment_reference: '',
    payment_notes: ''
  });

  // Fetch expense claims
  const { data: claimsData, isLoading } = useQuery({
    queryKey: ['admin-expense-claims', schoolId, selectedStatus],
    queryFn: async () => {
      let url = `/api/admin/fees/claims?school_id=${schoolId}`;
      if (selectedStatus !== 'all') {
        url += `&status=${selectedStatus}`;
      }

      const headers = await getAuthHeaders();
      const response = await fetch(url, {
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch claims');
      }

      const result = await response.json();
      return result.data as ExpenseClaim[];
    },
    enabled: !!schoolId
  });

  // Update claim mutation
  const updateClaimMutation = useMutation({
    mutationFn: async (data: { claim_id: string; status: string; [key: string]: any }) => {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/admin/fees/claims?school_id=${schoolId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update claim');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-expense-claims', schoolId] });
      toast.success('Claim updated successfully');
      setShowReviewDialog(false);
      setShowPaymentDialog(false);
      setSelectedClaim(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const handleReview = (claim: ExpenseClaim, action: 'approve' | 'reject') => {
    setSelectedClaim(claim);
    setReviewForm({
      status: action === 'approve' ? 'approved' : 'rejected',
      approved_amount: claim.amount,
      rejection_reason: '',
      review_notes: ''
    });
    setShowReviewDialog(true);
  };

  const handleMarkPaid = (claim: ExpenseClaim) => {
    setSelectedClaim(claim);
    setPaymentForm({
      payment_reference: '',
      payment_notes: ''
    });
    setShowPaymentDialog(true);
  };

  const submitReview = () => {
    if (!selectedClaim) return;

    updateClaimMutation.mutate({
      claim_id: selectedClaim.id,
      ...reviewForm
    });
  };

  const submitPayment = () => {
    if (!selectedClaim) return;

    updateClaimMutation.mutate({
      claim_id: selectedClaim.id,
      status: 'paid',
      ...paymentForm
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: { variant: 'secondary', label: 'Pending' },
      under_review: { variant: 'default', label: 'Under Review' },
      approved: { variant: 'default', label: 'Approved', className: 'bg-green-500' },
      rejected: { variant: 'destructive', label: 'Rejected' },
      paid: { variant: 'default', label: 'Paid', className: 'bg-blue-500' }
    };

    const config = variants[status] || variants.pending;
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const getStats = () => {
    if (!claimsData) return { total: 0, pending: 0, approved: 0, totalAmount: 0 };

    return {
      total: claimsData.length,
      pending: claimsData.filter(c => c.status === 'pending').length,
      approved: claimsData.filter(c => c.status === 'approved').length,
      totalAmount: claimsData.filter(c => c.status === 'approved' || c.status === 'paid')
        .reduce((sum, c) => sum + (c.approved_amount || c.amount), 0)
    };
  };

  const stats = getStats();

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Total Claims</p>
            <p className="text-3xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Pending</p>
            <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Approved</p>
            <p className="text-3xl font-bold text-green-600">{stats.approved}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Total Amount</p>
            <p className="text-3xl font-bold">₹{stats.totalAmount.toFixed(0)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Claims Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Expense Claims</CardTitle>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Claims</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div>Loading...</div>
          ) : claimsData && claimsData.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Receipt</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {claimsData.map((claim) => (
                    <TableRow key={claim.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{claim.employee_name}</p>
                          <p className="text-sm text-gray-500">{claim.department}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{new Date(claim.expense_date).toLocaleDateString()}</p>
                          <p className="text-xs text-gray-500">Claimed: {new Date(claim.claim_date).toLocaleDateString()}</p>
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">{claim.expense_category}</TableCell>
                      <TableCell className="max-w-xs truncate">{claim.description}</TableCell>
                      <TableCell className="text-right font-semibold">₹{claim.amount.toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(claim.status)}</TableCell>
                      <TableCell>
                        {claim.receipt_url ? (
                          <a
                            href={claim.receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            <FileText className="h-4 w-4" />
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {claim.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600"
                                onClick={() => handleReview(claim, 'approve')}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600"
                                onClick={() => handleReview(claim, 'reject')}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {claim.status === 'approved' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-blue-600"
                              onClick={() => handleMarkPaid(claim)}
                            >
                              <DollarSign className="h-4 w-4 mr-1" />
                              Mark Paid
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No expense claims found.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {reviewForm.status === 'approved' ? 'Approve' : 'Reject'} Expense Claim
            </DialogTitle>
          </DialogHeader>

          {selectedClaim && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Employee</p>
                    <p className="font-medium">{selectedClaim.employee_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Category</p>
                    <p className="font-medium capitalize">{selectedClaim.expense_category}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Expense Date</p>
                    <p className="font-medium">{new Date(selectedClaim.expense_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Claimed Amount</p>
                    <p className="font-semibold text-lg">₹{selectedClaim.amount.toFixed(2)}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-gray-600 text-sm">Description</p>
                  <p className="font-medium">{selectedClaim.description}</p>
                </div>
                {selectedClaim.receipt_url && (
                  <div className="mt-4">
                    <a
                      href={selectedClaim.receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-2 text-sm"
                    >
                      <FileText className="h-4 w-4" />
                      View Receipt
                    </a>
                  </div>
                )}
              </div>

              {reviewForm.status === 'approved' ? (
                <div>
                  <Label>Approved Amount*</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max={selectedClaim.amount}
                    value={reviewForm.approved_amount}
                    onChange={(e) => setReviewForm({ ...reviewForm, approved_amount: parseFloat(e.target.value) || 0 })}
                    required
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    You can approve a different amount (max: ₹{selectedClaim.amount.toFixed(2)})
                  </p>
                </div>
              ) : (
                <div>
                  <Label>Rejection Reason*</Label>
                  <Textarea
                    value={reviewForm.rejection_reason}
                    onChange={(e) => setReviewForm({ ...reviewForm, rejection_reason: e.target.value })}
                    rows={3}
                    required
                    placeholder="Explain why this claim is being rejected..."
                  />
                </div>
              )}

              <div>
                <Label>Review Notes (Optional)</Label>
                <Textarea
                  value={reviewForm.review_notes}
                  onChange={(e) => setReviewForm({ ...reviewForm, review_notes: e.target.value })}
                  rows={2}
                  placeholder="Any additional notes..."
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={submitReview}
              disabled={updateClaimMutation.isPending}
              className={reviewForm.status === 'approved' ? 'bg-green-600' : 'bg-red-600'}
            >
              {updateClaimMutation.isPending ? 'Processing...' :
               reviewForm.status === 'approved' ? 'Approve Claim' : 'Reject Claim'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Paid</DialogTitle>
          </DialogHeader>

          {selectedClaim && (
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded">
                <p className="text-sm text-gray-600">Approved Amount</p>
                <p className="text-2xl font-bold text-green-700">
                  ₹{(selectedClaim.approved_amount || selectedClaim.amount).toFixed(2)}
                </p>
                <p className="text-sm text-gray-600 mt-2">Employee: {selectedClaim.employee_name}</p>
              </div>

              {selectedClaim.bank_account_number && (
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <p className="font-semibold mb-2">Bank Details</p>
                  <p><strong>Bank:</strong> {selectedClaim.bank_name}</p>
                  <p><strong>Account:</strong> {selectedClaim.bank_account_number}</p>
                  <p><strong>IFSC:</strong> {selectedClaim.ifsc_code}</p>
                </div>
              )}

              <div>
                <Label>Payment Reference*</Label>
                <Input
                  value={paymentForm.payment_reference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_reference: e.target.value })}
                  placeholder="Transaction ID / Cheque Number"
                  required
                />
              </div>

              <div>
                <Label>Payment Notes (Optional)</Label>
                <Textarea
                  value={paymentForm.payment_notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_notes: e.target.value })}
                  rows={2}
                  placeholder="Any additional notes..."
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={submitPayment}
              disabled={updateClaimMutation.isPending}
              className="bg-blue-600"
            >
              {updateClaimMutation.isPending ? 'Processing...' : 'Mark as Paid'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
