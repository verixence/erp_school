'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface BankAccount {
  id: string;
  account_name: string;
  bank_name: string;
  account_number: string;
  ifsc_code?: string;
  branch_name?: string;
  account_type: 'savings' | 'current';
  opening_balance: number;
  current_balance: number;
  is_primary: boolean;
  is_active: boolean;
}

export default function BankMasterList({ schoolId }: { schoolId: string }) {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selected, setSelected] = useState<BankAccount | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    account_name: '',
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    branch_name: '',
    account_type: 'current' as 'savings' | 'current',
    opening_balance: 0,
    is_primary: false,
    is_active: true
  });

  const { data, isLoading } = useQuery({
    queryKey: ['bank-accounts', schoolId],
    queryFn: async () => {
      const response = await fetch(`/api/admin/fees/bank-accounts?school_id=${schoolId}`);
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch(`/api/admin/fees/bank-accounts?school_id=${schoolId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error((await response.json()).error);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts', schoolId] });
      toast.success('Bank account created');
      resetForm();
    },
    onError: (error: Error) => toast.error(error.message)
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData & { account_id: string }) => {
      const response = await fetch(`/api/admin/fees/bank-accounts?school_id=${schoolId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts', schoolId] });
      toast.success('Bank account updated');
      resetForm();
    },
    onError: (error: Error) => toast.error(error.message)
  });

  const resetForm = () => {
    setFormData({
      account_name: '',
      bank_name: '',
      account_number: '',
      ifsc_code: '',
      branch_name: '',
      account_type: 'current',
      opening_balance: 0,
      is_primary: false,
      is_active: true
    });
    setIsModalOpen(false);
    setSelected(null);
  };

  const handleCreate = () => {
    setModalMode('create');
    resetForm();
    setIsModalOpen(true);
  };

  const handleEdit = (account: BankAccount) => {
    setModalMode('edit');
    setSelected(account);
    setFormData({
      account_name: account.account_name,
      bank_name: account.bank_name,
      account_number: account.account_number,
      ifsc_code: account.ifsc_code || '',
      branch_name: account.branch_name || '',
      account_type: account.account_type,
      opening_balance: account.opening_balance,
      is_primary: account.is_primary,
      is_active: account.is_active
    });
    setIsModalOpen(true);
  };

  const handleView = (account: BankAccount) => {
    setModalMode('view');
    setSelected(account);
    setFormData({
      account_name: account.account_name,
      bank_name: account.bank_name,
      account_number: account.account_number,
      ifsc_code: account.ifsc_code || '',
      branch_name: account.branch_name || '',
      account_type: account.account_type,
      opening_balance: account.opening_balance,
      is_primary: account.is_primary,
      is_active: account.is_active
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (modalMode === 'create') {
      createMutation.mutate(formData);
    } else if (modalMode === 'edit' && selected) {
      updateMutation.mutate({ ...formData, account_id: selected.id });
    }
  };

  const filteredData = data?.data?.filter((a: BankAccount) =>
    a.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.bank_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.account_number.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Input
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          New
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account Name</TableHead>
                <TableHead>Bank Name</TableHead>
                <TableHead>Account No</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    No bank accounts found
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((account: BankAccount) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">
                      {account.account_name}
                      {account.is_primary && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Primary</span>
                      )}
                    </TableCell>
                    <TableCell>{account.bank_name}</TableCell>
                    <TableCell className="font-mono text-sm">{account.account_number}</TableCell>
                    <TableCell className="capitalize">{account.account_type}</TableCell>
                    <TableCell className="text-right">₹{account.current_balance.toFixed(2)}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded ${account.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {account.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleView(account)}
                          className="h-8 w-8"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(account)}
                          className="h-8 w-8"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {modalMode === 'create' && 'New Bank Account'}
              {modalMode === 'edit' && 'Edit Bank Account'}
              {modalMode === 'view' && 'Bank Master Information'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Account Name*</Label>
                <Input
                  value={formData.account_name}
                  onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                  required
                  disabled={modalMode === 'view'}
                  placeholder="e.g., SBI Main Account"
                />
              </div>
              <div>
                <Label>Bank Name*</Label>
                <Input
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  required
                  disabled={modalMode === 'view'}
                  placeholder="e.g., State Bank of India"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Account Number*</Label>
                <Input
                  value={formData.account_number}
                  onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                  required
                  disabled={modalMode === 'view'}
                  placeholder="Account Number"
                />
              </div>
              <div>
                <Label>IFSC Code</Label>
                <Input
                  value={formData.ifsc_code}
                  onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value })}
                  disabled={modalMode === 'view'}
                  placeholder="e.g., SBIN0001234"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Branch Name</Label>
                <Input
                  value={formData.branch_name}
                  onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                  disabled={modalMode === 'view'}
                  placeholder="Branch Name"
                />
              </div>
              <div>
                <Label>Account Type*</Label>
                <Select
                  value={formData.account_type}
                  onValueChange={(value: 'savings' | 'current') => setFormData({ ...formData, account_type: value })}
                  disabled={modalMode === 'view'}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current">Current</SelectItem>
                    <SelectItem value="savings">Savings</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Opening Balance</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.opening_balance}
                  onChange={(e) => setFormData({ ...formData, opening_balance: parseFloat(e.target.value) || 0 })}
                  disabled={modalMode === 'view'}
                  placeholder="0.00"
                />
              </div>
              <div className="flex items-center space-x-4 pt-6">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_primary}
                    onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
                    disabled={modalMode === 'view'}
                    className="rounded"
                  />
                  <span className="text-sm">Primary Account</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    disabled={modalMode === 'view'}
                    className="rounded"
                  />
                  <span className="text-sm">Active</span>
                </label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetForm}>
                {modalMode === 'view' ? 'Close' : 'Cancel'}
              </Button>
              {modalMode !== 'view' && (
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  Save
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
