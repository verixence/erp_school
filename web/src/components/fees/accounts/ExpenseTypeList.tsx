'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface ExpenseType {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
}

interface ExpenseTypeListProps {
  schoolId: string;
}

export default function ExpenseTypeList({ schoolId }: ExpenseTypeListProps) {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedExpenseType, setSelectedExpenseType] = useState<ExpenseType | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true
  });

  // Fetch expense types
  const { data, isLoading } = useQuery({
    queryKey: ['expense-types', schoolId],
    queryFn: async () => {
      const response = await fetch(`/api/admin/fees/expense-types?school_id=${schoolId}`);
      if (!response.ok) throw new Error('Failed to fetch expense types');
      return response.json();
    }
  });

  // Create expense type
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch(`/api/admin/fees/expense-types?school_id=${schoolId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create expense type');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-types', schoolId] });
      toast.success('Expense type created successfully');
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  // Update expense type
  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData & { expense_type_id: string }) => {
      const response = await fetch(`/api/admin/fees/expense-types?school_id=${schoolId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update expense type');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-types', schoolId] });
      toast.success('Expense type updated successfully');
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  // Delete expense type
  const deleteMutation = useMutation({
    mutationFn: async (expenseTypeId: string) => {
      const response = await fetch(
        `/api/admin/fees/expense-types?school_id=${schoolId}&expense_type_id=${expenseTypeId}`,
        { method: 'DELETE' }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete expense type');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-types', schoolId] });
      toast.success('Expense type deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const resetForm = () => {
    setFormData({ name: '', description: '', is_active: true });
    setIsModalOpen(false);
    setSelectedExpenseType(null);
  };

  const handleCreate = () => {
    setModalMode('create');
    resetForm();
    setIsModalOpen(true);
  };

  const handleEdit = (expenseType: ExpenseType) => {
    setModalMode('edit');
    setSelectedExpenseType(expenseType);
    setFormData({
      name: expenseType.name,
      description: expenseType.description || '',
      is_active: expenseType.is_active
    });
    setIsModalOpen(true);
  };

  const handleView = (expenseType: ExpenseType) => {
    setModalMode('view');
    setSelectedExpenseType(expenseType);
    setFormData({
      name: expenseType.name,
      description: expenseType.description || '',
      is_active: expenseType.is_active
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (modalMode === 'create') {
      createMutation.mutate(formData);
    } else if (modalMode === 'edit' && selectedExpenseType) {
      updateMutation.mutate({ ...formData, expense_type_id: selectedExpenseType.id });
    }
  };

  const handleDelete = (expenseTypeId: string) => {
    if (confirm('Are you sure you want to delete this expense type?')) {
      deleteMutation.mutate(expenseTypeId);
    }
  };

  const filteredData = data?.data?.filter((et: ExpenseType) =>
    et.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Input
          placeholder="Search expense types..."
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
                <TableHead>Expense Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                    No expense types found
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((expenseType: ExpenseType) => (
                  <TableRow key={expenseType.id}>
                    <TableCell className="font-medium">{expenseType.name}</TableCell>
                    <TableCell className="max-w-md truncate">
                      {expenseType.description || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleView(expenseType)}
                          className="h-8 w-8"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(expenseType)}
                          className="h-8 w-8"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(expenseType.id)}
                          className="h-8 w-8 text-red-600 hover:text-red-700"
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

      <div className="text-sm text-muted-foreground">
        Showing {filteredData.length} of {data?.data?.length || 0} entries
      </div>

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {modalMode === 'create' && 'New Expense Type'}
              {modalMode === 'edit' && 'Edit Expense Type'}
              {modalMode === 'view' && 'Expense Type Info'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Name*</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Expense Type"
                required
                disabled={modalMode === 'view'}
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description"
                rows={3}
                disabled={modalMode === 'view'}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetForm}>
                {modalMode === 'view' ? 'Close' : 'Cancel'}
              </Button>
              {modalMode !== 'view' && (
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
