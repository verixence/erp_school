'use client';

import { useState, useEffect } from 'react';
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
import { Plus, Upload, Eye, FileText, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase-client';

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
  created_at: string;
}

export default function ExpenseClaimForm({ schoolId, userId }: { schoolId: string; userId: string }) {
  const queryClient = useQueryClient();
  const [showClaimDialog, setShowClaimDialog] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<ExpenseClaim | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  // Fetch current user details
  const { data: userData } = useQuery({
    queryKey: ['current-user', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('first_name, last_name, display_name, email')
        .eq('id', userId)
        .single();

      if (error) throw error;
      // Combine names to create full name
      const fullName = data.display_name || `${data.first_name || ''} ${data.last_name || ''}`.trim();
      return { ...data, full_name: fullName };
    },
    enabled: !!userId
  });

  // Fetch teacher details for employee_id
  const { data: teacherData } = useQuery({
    queryKey: ['teacher-details', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teachers')
        .select('employee_id, department')
        .eq('user_id', userId)
        .single();

      if (error) {
        // Teacher record might not exist, return defaults
        return { employee_id: '', department: '' };
      }
      return data;
    },
    enabled: !!userId
  });

  const [claimForm, setClaimForm] = useState({
    employee_name: userData?.full_name || '',
    employee_id: teacherData?.employee_id || '',
    department: teacherData?.department || '',
    claim_date: new Date().toISOString().split('T')[0],
    expense_date: new Date().toISOString().split('T')[0],
    expense_category: 'transport',
    description: '',
    amount: 0,
    receipt_url: '',
    receipt_file_name: '',
    payment_method: 'reimbursement',
    bank_account_number: '',
    bank_name: '',
    ifsc_code: ''
  });

  // Fetch expense claims for the user
  const { data: claimsData, isLoading } = useQuery({
    queryKey: ['expense-claims', schoolId, userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expense_claims')
        .select('*')
        .eq('school_id', schoolId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ExpenseClaim[];
    },
    enabled: !!schoolId && !!userId
  });

  // Update form when user data is loaded
  useEffect(() => {
    if (userData || teacherData) {
      setClaimForm(prev => ({
        ...prev,
        employee_name: userData?.full_name || prev.employee_name,
        employee_id: teacherData?.employee_id || prev.employee_id,
        department: teacherData?.department || prev.department
      }));
    }
  }, [userData, teacherData]);

  // Create expense claim mutation
  const createClaimMutation = useMutation({
    mutationFn: async (claimData: typeof claimForm) => {
      // Get session token from Supabase
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`/api/admin/fees/claims?school_id=${schoolId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        credentials: 'include',
        body: JSON.stringify(claimData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create claim');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-claims', schoolId, userId] });
      toast.success('Expense claim submitted successfully');
      setShowClaimDialog(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const resetForm = () => {
    setClaimForm({
      employee_name: '',
      employee_id: '',
      department: '',
      claim_date: new Date().toISOString().split('T')[0],
      expense_date: new Date().toISOString().split('T')[0],
      expense_category: 'transport',
      description: '',
      amount: 0,
      receipt_url: '',
      receipt_file_name: '',
      payment_method: 'reimbursement',
      bank_account_number: '',
      bank_name: '',
      ifsc_code: ''
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPG, PNG, and PDF files are allowed');
      return;
    }

    setUploadingReceipt(true);

    try {
      // Sanitize filename - remove spaces and special characters
      const sanitizedName = file.name
        .replace(/\s+/g, '_')           // Replace spaces with underscores
        .replace(/[^\w.-]/g, '')        // Remove special characters except dots, dashes, underscores
        .toLowerCase();

      const fileName = `${Date.now()}_${sanitizedName}`;
      const filePath = `${schoolId}/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('expense-receipts')
        .upload(filePath, file);

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('expense-receipts')
        .getPublicUrl(filePath);

      setClaimForm({
        ...claimForm,
        receipt_url: publicUrl,
        receipt_file_name: file.name
      });

      toast.success('Receipt uploaded successfully');
    } catch (error: any) {
      toast.error('Failed to upload receipt: ' + error.message);
    } finally {
      setUploadingReceipt(false);
    }
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>My Expense Claims</CardTitle>
          <Button onClick={() => setShowClaimDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Claim
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div>Loading...</div>
          ) : claimsData && claimsData.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Claim Date</TableHead>
                  <TableHead>Expense Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {claimsData.map((claim) => (
                  <TableRow key={claim.id}>
                    <TableCell>{new Date(claim.claim_date).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(claim.expense_date).toLocaleDateString()}</TableCell>
                    <TableCell className="capitalize">{claim.expense_category}</TableCell>
                    <TableCell className="max-w-xs truncate">{claim.description}</TableCell>
                    <TableCell className="text-right">₹{claim.amount.toFixed(2)}</TableCell>
                    <TableCell>{getStatusBadge(claim.status)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedClaim(claim);
                          setShowViewDialog(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No expense claims yet. Click "New Claim" to submit one.
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Claim Dialog */}
      <Dialog open={showClaimDialog} onOpenChange={setShowClaimDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submit Expense Claim</DialogTitle>
          </DialogHeader>

          <form onSubmit={(e) => {
            e.preventDefault();
            createClaimMutation.mutate(claimForm);
          }}>
            <div className="space-y-4">
              {/* Employee Details - Auto-filled from logged in user */}
              <div className="bg-gray-50 p-4 rounded border">
                <h3 className="font-semibold mb-3 text-sm">Employee Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Name</p>
                    <p className="font-medium">{claimForm.employee_name || 'Loading...'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Employee ID</p>
                    <p className="font-medium">{claimForm.employee_id || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Department</p>
                    <p className="font-medium">{claimForm.department || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Claim Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Claim Date*</Label>
                  <Input
                    type="date"
                    value={claimForm.claim_date}
                    onChange={(e) => setClaimForm({ ...claimForm, claim_date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Expense Date*</Label>
                  <Input
                    type="date"
                    value={claimForm.expense_date}
                    onChange={(e) => setClaimForm({ ...claimForm, expense_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Expense Category*</Label>
                  <Select
                    value={claimForm.expense_category}
                    onValueChange={(value) => setClaimForm({ ...claimForm, expense_category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="transport">Transport</SelectItem>
                      <SelectItem value="meals">Meals</SelectItem>
                      <SelectItem value="supplies">Supplies</SelectItem>
                      <SelectItem value="accommodation">Accommodation</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Amount*</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={claimForm.amount}
                    onChange={(e) => setClaimForm({ ...claimForm, amount: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
              </div>

              <div>
                <Label>Description*</Label>
                <Textarea
                  value={claimForm.description}
                  onChange={(e) => setClaimForm({ ...claimForm, description: e.target.value })}
                  rows={3}
                  required
                />
              </div>

              {/* Receipt Upload */}
              <div>
                <Label>Upload Receipt (JPG, PNG, PDF - Max 5MB)</Label>
                <div className="mt-2">
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,image/jpg,application/pdf"
                    onChange={handleFileUpload}
                    disabled={uploadingReceipt}
                  />
                  {uploadingReceipt && <p className="text-sm text-gray-500 mt-1">Uploading...</p>}
                  {claimForm.receipt_url && (
                    <p className="text-sm text-green-600 mt-1">✓ {claimForm.receipt_file_name}</p>
                  )}
                </div>
              </div>

              {/* Bank Details */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Bank Details (for reimbursement)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Bank Name</Label>
                    <Input
                      value={claimForm.bank_name}
                      onChange={(e) => setClaimForm({ ...claimForm, bank_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Account Number</Label>
                    <Input
                      value={claimForm.bank_account_number}
                      onChange={(e) => setClaimForm({ ...claimForm, bank_account_number: e.target.value })}
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <Label>IFSC Code</Label>
                  <Input
                    value={claimForm.ifsc_code}
                    onChange={(e) => setClaimForm({ ...claimForm, ifsc_code: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setShowClaimDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createClaimMutation.isPending}>
                {createClaimMutation.isPending ? 'Submitting...' : 'Submit Claim'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Claim Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Expense Claim Details</DialogTitle>
          </DialogHeader>

          {selectedClaim && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Status</p>
                  <div className="mt-1">{getStatusBadge(selectedClaim.status)}</div>
                </div>
                <div>
                  <p className="text-gray-600">Amount</p>
                  <p className="font-semibold text-lg">₹{selectedClaim.amount.toFixed(2)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Employee Name</p>
                  <p className="font-medium">{selectedClaim.employee_name}</p>
                </div>
                <div>
                  <p className="text-gray-600">Department</p>
                  <p className="font-medium">{selectedClaim.department || '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Claim Date</p>
                  <p className="font-medium">{new Date(selectedClaim.claim_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-gray-600">Expense Date</p>
                  <p className="font-medium">{new Date(selectedClaim.expense_date).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="text-sm">
                <p className="text-gray-600">Category</p>
                <p className="font-medium capitalize">{selectedClaim.expense_category}</p>
              </div>

              <div className="text-sm">
                <p className="text-gray-600">Description</p>
                <p className="font-medium">{selectedClaim.description}</p>
              </div>

              {selectedClaim.receipt_url && (
                <div className="text-sm">
                  <p className="text-gray-600 mb-2">Receipt</p>
                  <a
                    href={selectedClaim.receipt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    {selectedClaim.receipt_file_name || 'View Receipt'}
                  </a>
                </div>
              )}

              {selectedClaim.status === 'approved' && selectedClaim.approved_amount && (
                <div className="bg-green-50 p-3 rounded text-sm">
                  <p className="text-gray-600">Approved Amount</p>
                  <p className="font-semibold text-green-700 text-lg">₹{selectedClaim.approved_amount.toFixed(2)}</p>
                </div>
              )}

              {selectedClaim.status === 'rejected' && selectedClaim.rejection_reason && (
                <div className="bg-red-50 p-3 rounded text-sm">
                  <p className="text-gray-600">Rejection Reason</p>
                  <p className="font-medium text-red-700">{selectedClaim.rejection_reason}</p>
                </div>
              )}

              {selectedClaim.review_notes && (
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <p className="text-gray-600">Review Notes</p>
                  <p className="font-medium">{selectedClaim.review_notes}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowViewDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
