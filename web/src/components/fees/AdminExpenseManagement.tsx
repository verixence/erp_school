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
import { Eye, Pencil, Trash2, Plus, FileText, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase-client';

interface SchoolExpense {
  id: string;
  expense_number: string;
  category: string;
  subcategory?: string;
  description: string;
  amount: number;
  expense_date: string;
  payment_method?: string;
  payment_reference?: string;
  vendor_name?: string;
  vendor_contact?: string;
  receipt_url?: string;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  approved_by?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

interface ExpenseType {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
}

export default function AdminExpenseManagement({ schoolId }: { schoolId: string }) {
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<SchoolExpense | null>(null);

  const [expenseForm, setExpenseForm] = useState({
    expense_type_id: '',
    category: '',
    subcategory: '',
    description: '',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    payment_reference: '',
    vendor_name: '',
    vendor_contact: '',
    notes: '',
    receipt_url: '',
    receipt_file_name: ''
  });

  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  // Fetch expense types
  const { data: expenseTypesData } = useQuery({
    queryKey: ['expense-types', schoolId],
    queryFn: async () => {
      const response = await fetch(`/api/admin/fees/expense-types?school_id=${schoolId}`);
      if (!response.ok) throw new Error('Failed to fetch expense types');
      const result = await response.json();
      return result.data as ExpenseType[];
    },
    enabled: !!schoolId
  });

  // Fetch school expenses
  const { data: expensesData, isLoading } = useQuery({
    queryKey: ['school-expenses', schoolId, selectedStatus],
    queryFn: async () => {
      let url = `/api/admin/fees/expenses?school_id=${schoolId}`;
      if (selectedStatus !== 'all') {
        url += `&status=${selectedStatus}`;
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch expenses');
      const result = await response.json();
      return result;
    },
    enabled: !!schoolId
  });

  // Handle receipt upload
  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingReceipt(true);
    try {
      // Sanitize filename
      const sanitizedName = file.name
        .replace(/\s+/g, '_')
        .replace(/[^\w.-]/g, '')
        .toLowerCase();

      const fileName = `${Date.now()}_${sanitizedName}`;
      const filePath = `${schoolId}/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('expense-receipts')
        .upload(filePath, file);

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('expense-receipts')
        .getPublicUrl(filePath);

      setExpenseForm({
        ...expenseForm,
        receipt_url: publicUrl,
        receipt_file_name: file.name
      });
      setReceiptFile(file);
      toast.success('Receipt uploaded successfully');
    } catch (error: any) {
      console.error('Receipt upload error:', error);
      toast.error(error.message || 'Failed to upload receipt');
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleRemoveReceipt = () => {
    setExpenseForm({ ...expenseForm, receipt_url: '', receipt_file_name: '' });
    setReceiptFile(null);
  };

  // Create expense mutation
  const createExpenseMutation = useMutation({
    mutationFn: async (data: typeof expenseForm) => {
      const response = await fetch(`/api/admin/fees/expenses?school_id=${schoolId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: data.category,
          subcategory: data.subcategory || undefined,
          description: data.description,
          amount: parseFloat(data.amount),
          expense_date: data.expense_date,
          payment_method: data.payment_method,
          payment_reference: data.payment_reference || undefined,
          vendor_name: data.vendor_name || undefined,
          vendor_contact: data.vendor_contact || undefined,
          receipt_url: data.receipt_url || undefined,
          notes: data.notes || undefined
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create expense');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-expenses', schoolId] });
      toast.success('Expense created successfully');
      setShowExpenseDialog(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  // Update expense status mutation
  const updateExpenseMutation = useMutation({
    mutationFn: async ({ expenseId, status }: { expenseId: string; status: string }) => {
      const response = await fetch(`/api/admin/fees/expenses?school_id=${schoolId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expense_id: expenseId,
          status
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update expense');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-expenses', schoolId] });
      toast.success('Expense updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const resetForm = () => {
    setExpenseForm({
      expense_type_id: '',
      category: '',
      subcategory: '',
      description: '',
      amount: '',
      expense_date: new Date().toISOString().split('T')[0],
      payment_method: 'cash',
      payment_reference: '',
      vendor_name: '',
      vendor_contact: '',
      notes: '',
      receipt_url: '',
      receipt_file_name: ''
    });
    setReceiptFile(null);
  };

  const handleExpenseTypeChange = (expenseTypeId: string) => {
    const selectedType = expenseTypesData?.find(et => et.id === expenseTypeId);
    setExpenseForm({
      ...expenseForm,
      expense_type_id: expenseTypeId,
      category: selectedType?.name || ''
    });
  };

  const handleSubmit = () => {
    if (!expenseForm.category || !expenseForm.description || !expenseForm.amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    createExpenseMutation.mutate(expenseForm);
  };

  const handleViewExpense = (expense: SchoolExpense) => {
    setSelectedExpense(expense);
    setShowViewDialog(true);
  };

  const handleUpdateStatus = (expenseId: string, status: string) => {
    if (confirm(`Are you sure you want to mark this expense as ${status}?`)) {
      updateExpenseMutation.mutate({ expenseId, status });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: { variant: 'secondary', label: 'Pending' },
      approved: { variant: 'default', label: 'Approved', className: 'bg-green-500' },
      paid: { variant: 'default', label: 'Paid', className: 'bg-blue-500' },
      rejected: { variant: 'destructive', label: 'Rejected' }
    };

    const config = variants[status] || variants.pending;
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const summary = expensesData?.summary || {
    total_expenses: 0,
    total_amount: 0,
    pending_amount: 0,
    paid_amount: 0
  };

  const expenses = expensesData?.data || [];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Total Expenses</p>
            <p className="text-3xl font-bold">{summary.total_expenses}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Total Amount</p>
            <p className="text-3xl font-bold">₹{summary.total_amount.toFixed(0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Pending</p>
            <p className="text-3xl font-bold text-yellow-600">₹{summary.pending_amount.toFixed(0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Paid</p>
            <p className="text-3xl font-bold text-green-600">₹{summary.paid_amount.toFixed(0)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>School Expenses</CardTitle>
            <div className="flex gap-2">
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Expenses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => setShowExpenseDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Expense
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div>Loading...</div>
          ) : expenses.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Voucher No</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Payee</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Payment Status</TableHead>
                    <TableHead>Payment Type</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense: SchoolExpense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="font-medium">{expense.expense_number}</TableCell>
                      <TableCell>{new Date(expense.expense_date).toLocaleDateString()}</TableCell>
                      <TableCell>{expense.vendor_name || '-'}</TableCell>
                      <TableCell className="max-w-xs truncate">{expense.description}</TableCell>
                      <TableCell className="text-right font-semibold">₹{expense.amount.toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(expense.status)}</TableCell>
                      <TableCell className="capitalize">{expense.category}</TableCell>
                      <TableCell className="capitalize">{expense.payment_method || '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewExpense(expense)}
                            className="h-8 w-8"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {expense.status === 'pending' && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleUpdateStatus(expense.id, 'approved')}
                                className="h-8 w-8 text-green-600"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleUpdateStatus(expense.id, 'rejected')}
                                className="h-8 w-8 text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {expense.status === 'approved' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateStatus(expense.id, 'paid')}
                            >
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
              No expenses found.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Expense Dialog */}
      <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Expense Entry</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Expense Type*</Label>
                <Select value={expenseForm.expense_type_id} onValueChange={handleExpenseTypeChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select expense type" />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseTypesData?.filter(et => et.is_active).map(expenseType => (
                      <SelectItem key={expenseType.id} value={expenseType.id}>
                        {expenseType.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Subcategory</Label>
                <Input
                  value={expenseForm.subcategory}
                  onChange={(e) => setExpenseForm({ ...expenseForm, subcategory: e.target.value })}
                  placeholder="Optional subcategory"
                />
              </div>

              <div>
                <Label>Amount*</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  placeholder="Enter amount"
                  required
                />
              </div>

              <div>
                <Label>Expense Date*</Label>
                <Input
                  type="date"
                  value={expenseForm.expense_date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label>Payment Method</Label>
                <Select value={expenseForm.payment_method} onValueChange={(value) => setExpenseForm({ ...expenseForm, payment_method: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Payment Reference</Label>
                <Input
                  value={expenseForm.payment_reference}
                  onChange={(e) => setExpenseForm({ ...expenseForm, payment_reference: e.target.value })}
                  placeholder="Transaction ID / Cheque No"
                />
              </div>

              <div>
                <Label>Vendor Name</Label>
                <Input
                  value={expenseForm.vendor_name}
                  onChange={(e) => setExpenseForm({ ...expenseForm, vendor_name: e.target.value })}
                  placeholder="Vendor or supplier name"
                />
              </div>

              <div>
                <Label>Vendor Contact</Label>
                <Input
                  value={expenseForm.vendor_contact}
                  onChange={(e) => setExpenseForm({ ...expenseForm, vendor_contact: e.target.value })}
                  placeholder="Phone or email"
                />
              </div>
            </div>

            <div>
              <Label>Description*</Label>
              <Textarea
                value={expenseForm.description}
                onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                placeholder="Describe the expense"
                rows={3}
                required
              />
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={expenseForm.notes}
                onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                placeholder="Any additional notes"
                rows={2}
              />
            </div>

            {/* Receipt Upload */}
            <div>
              <Label>Receipt (Optional)</Label>
              <div className="mt-2">
                {!expenseForm.receipt_url ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleReceiptUpload}
                      disabled={uploadingReceipt}
                      className="flex-1"
                    />
                    {uploadingReceipt && (
                      <span className="text-sm text-gray-500">Uploading...</span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-2 border rounded">
                    <FileText className="h-4 w-4 text-green-600" />
                    <span className="text-sm flex-1">{expenseForm.receipt_file_name || 'Receipt uploaded'}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveReceipt}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExpenseDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createExpenseMutation.isPending}
            >
              {createExpenseMutation.isPending ? 'Creating...' : 'Create Expense'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Expense Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Expense Details</DialogTitle>
          </DialogHeader>

          {selectedExpense && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Voucher No</p>
                  <p className="font-medium">{selectedExpense.expense_number}</p>
                </div>
                <div>
                  <p className="text-gray-600">Status</p>
                  {getStatusBadge(selectedExpense.status)}
                </div>
                <div>
                  <p className="text-gray-600">Category</p>
                  <p className="font-medium capitalize">{selectedExpense.category}</p>
                </div>
                <div>
                  <p className="text-gray-600">Amount</p>
                  <p className="font-semibold text-lg">₹{selectedExpense.amount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Expense Date</p>
                  <p className="font-medium">{new Date(selectedExpense.expense_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-gray-600">Payment Method</p>
                  <p className="font-medium capitalize">{selectedExpense.payment_method || '-'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-600">Vendor</p>
                  <p className="font-medium">{selectedExpense.vendor_name || '-'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-600">Description</p>
                  <p className="font-medium">{selectedExpense.description}</p>
                </div>
                {selectedExpense.notes && (
                  <div className="col-span-2">
                    <p className="text-gray-600">Notes</p>
                    <p className="font-medium">{selectedExpense.notes}</p>
                  </div>
                )}
                {selectedExpense.receipt_url && (
                  <div className="col-span-2">
                    <p className="text-gray-600">Receipt</p>
                    <a
                      href={selectedExpense.receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-2 font-medium"
                    >
                      <FileText className="h-4 w-4" />
                      View Receipt
                    </a>
                  </div>
                )}
              </div>
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
