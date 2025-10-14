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

interface ChequeBook {
  id: string;
  bank_account_id: string;
  book_name: string;
  cheque_start_no: string;
  cheque_end_no: string;
  total_cheques: number;
  used_cheques: number;
  remaining_cheques: number;
  status: string;
  bank_accounts: {
    bank_name: string;
    account_number: string;
  };
}

export default function ChequeBookList({ schoolId }: { schoolId: string }) {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selected, setSelected] = useState<ChequeBook | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    bank_account_id: '',
    book_name: '',
    cheque_start_no: '',
    cheque_end_no: ''
  });

  // Fetch bank accounts for dropdown
  const { data: bankAccountsData } = useQuery({
    queryKey: ['bank-accounts', schoolId],
    queryFn: async () => {
      const response = await fetch(`/api/admin/fees/bank-accounts?school_id=${schoolId}`);
      if (!response.ok) throw new Error('Failed to fetch bank accounts');
      return response.json();
    }
  });

  const { data, isLoading } = useQuery({
    queryKey: ['cheque-books', schoolId],
    queryFn: async () => {
      const response = await fetch(`/api/admin/fees/cheque-books?school_id=${schoolId}`);
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch(`/api/admin/fees/cheque-books?school_id=${schoolId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error((await response.json()).error);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cheque-books', schoolId] });
      toast.success('Cheque book created');
      resetForm();
    },
    onError: (error: Error) => toast.error(error.message)
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData & { cheque_book_id: string }) => {
      const response = await fetch(`/api/admin/fees/cheque-books?school_id=${schoolId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cheque-books', schoolId] });
      toast.success('Cheque book updated');
      resetForm();
    },
    onError: (error: Error) => toast.error(error.message)
  });

  const deleteMutation = useMutation({
    mutationFn: async (chequeBookId: string) => {
      const response = await fetch(
        `/api/admin/fees/cheque-books?school_id=${schoolId}&cheque_book_id=${chequeBookId}`,
        { method: 'DELETE' }
      );
      if (!response.ok) throw new Error((await response.json()).error);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cheque-books', schoolId] });
      toast.success('Cheque book deleted');
    },
    onError: (error: Error) => toast.error(error.message)
  });

  const resetForm = () => {
    setFormData({
      bank_account_id: '',
      book_name: '',
      cheque_start_no: '',
      cheque_end_no: ''
    });
    setIsModalOpen(false);
    setSelected(null);
  };

  const handleCreate = () => {
    setModalMode('create');
    resetForm();
    setIsModalOpen(true);
  };

  const handleEdit = (chequeBook: ChequeBook) => {
    setModalMode('edit');
    setSelected(chequeBook);
    setFormData({
      bank_account_id: chequeBook.bank_account_id,
      book_name: chequeBook.book_name,
      cheque_start_no: chequeBook.cheque_start_no,
      cheque_end_no: chequeBook.cheque_end_no
    });
    setIsModalOpen(true);
  };

  const handleView = (chequeBook: ChequeBook) => {
    setModalMode('view');
    setSelected(chequeBook);
    setFormData({
      bank_account_id: chequeBook.bank_account_id,
      book_name: chequeBook.book_name,
      cheque_start_no: chequeBook.cheque_start_no,
      cheque_end_no: chequeBook.cheque_end_no
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (modalMode === 'create') {
      createMutation.mutate(formData);
    } else if (modalMode === 'edit' && selected) {
      updateMutation.mutate({ ...formData, cheque_book_id: selected.id });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this cheque book?')) {
      deleteMutation.mutate(id);
    }
  };

  const filteredData = data?.data?.filter((cb: ChequeBook) =>
    cb.book_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cb.bank_accounts.bank_name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const selectedBankAccount = bankAccountsData?.data?.find(
    (ba: any) => ba.id === formData.bank_account_id
  );

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
                <TableHead>Bank Name</TableHead>
                <TableHead>Book Name</TableHead>
                <TableHead>Account No</TableHead>
                <TableHead>Cheque Book Start No</TableHead>
                <TableHead>Cheque Book End No</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    No cheque books found
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((chequeBook: ChequeBook) => (
                  <TableRow key={chequeBook.id}>
                    <TableCell className="font-medium">
                      {chequeBook.bank_accounts.bank_name}
                    </TableCell>
                    <TableCell>{chequeBook.book_name}</TableCell>
                    <TableCell>{chequeBook.bank_accounts.account_number}</TableCell>
                    <TableCell>{chequeBook.cheque_start_no}</TableCell>
                    <TableCell>{chequeBook.cheque_end_no}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleView(chequeBook)}
                          className="h-8 w-8"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(chequeBook)}
                          className="h-8 w-8"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(chequeBook.id)}
                          className="h-8 w-8 text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
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
              {modalMode === 'create' && 'New Cheque Book'}
              {modalMode === 'edit' && 'Edit Cheque Book'}
              {modalMode === 'view' && 'Chequebook Info'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Bank Name*</Label>
                <Select
                  value={formData.bank_account_id}
                  onValueChange={(value) => setFormData({ ...formData, bank_account_id: value })}
                  disabled={modalMode === 'view'}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="---Select Bank---" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccountsData?.data?.map((ba: any) => (
                      <SelectItem key={ba.id} value={ba.id}>
                        {ba.bank_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Book Name*</Label>
                <Input
                  value={formData.book_name}
                  onChange={(e) => setFormData({ ...formData, book_name: e.target.value })}
                  required
                  disabled={modalMode === 'view'}
                  placeholder="Book Name"
                />
              </div>
            </div>

            <div>
              <Label>Account No.*</Label>
              <Input
                value={selectedBankAccount?.account_number || 'Select'}
                disabled
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cheque Book Start No.</Label>
                <Input
                  value={formData.cheque_start_no}
                  onChange={(e) => setFormData({ ...formData, cheque_start_no: e.target.value })}
                  disabled={modalMode === 'view'}
                  placeholder="Cheque Book Start No."
                />
              </div>
              <div>
                <Label>Cheque Book End No.</Label>
                <Input
                  value={formData.cheque_end_no}
                  onChange={(e) => setFormData({ ...formData, cheque_end_no: e.target.value })}
                  disabled={modalMode === 'view'}
                  placeholder="Cheque Book End No."
                />
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
