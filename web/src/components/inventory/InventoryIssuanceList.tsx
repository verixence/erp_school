'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Plus, ArrowRightLeft, CheckCircle, Clock, Package } from 'lucide-react';

interface InventoryIssuanceListProps {
  schoolId: string;
}

export default function InventoryIssuanceList({ schoolId }: InventoryIssuanceListProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [returnDialog, setReturnDialog] = useState<any>(null);
  const [formData, setFormData] = useState({
    item_id: '',
    issued_to_type: 'student',
    issued_to_name: '',
    quantity: 1,
    issue_date: new Date().toISOString().split('T')[0],
    expected_return_date: '',
    purpose: '',
    notes: '',
  });
  const queryClient = useQueryClient();

  const { data: itemsData } = useQuery({
    queryKey: ['inventory-items', schoolId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/inventory/items?school_id=${schoolId}&status=active`);
      if (!res.ok) throw new Error('Failed to fetch items');
      return res.json();
    },
  });

  const { data: issuancesData } = useQuery({
    queryKey: ['inventory-issuances', schoolId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/inventory/issuances?school_id=${schoolId}`);
      if (!res.ok) throw new Error('Failed to fetch issuances');
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/admin/inventory/issuances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ school_id: schoolId, ...data }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create issuance');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-issuances'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-dashboard'] });
      toast.success('Item issued successfully');
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const returnMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/admin/inventory/issuances', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ school_id: schoolId, ...data }),
      });
      if (!res.ok) throw new Error('Failed to return item');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-issuances'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-dashboard'] });
      toast.success('Item returned successfully');
      setReturnDialog(null);
    },
  });

  const resetForm = () => {
    setFormData({
      item_id: '',
      issued_to_type: 'student',
      issued_to_name: '',
      quantity: 1,
      issue_date: new Date().toISOString().split('T')[0],
      expected_return_date: '',
      purpose: '',
      notes: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleReturn = (issuance: any, condition: string) => {
    returnMutation.mutate({
      id: issuance.id,
      actual_return_date: new Date().toISOString().split('T')[0],
      return_condition: condition,
      status: 'returned',
    });
  };

  const activeIssuances = issuancesData?.issuances?.filter((i: any) => i.status === 'issued') || [];
  const returnedIssuances = issuancesData?.issuances?.filter((i: any) => i.status === 'returned') || [];
  const permanentIssuances = issuancesData?.issuances?.filter((i: any) => i.status === 'permanent') || [];
  const overdueIssuances = issuancesData?.issuances?.filter((i: any) =>
    i.status === 'issued' && i.expected_return_date && new Date(i.expected_return_date) < new Date()
  ) || [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Item Issuances</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Issue Item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Issue Item</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Item *</Label>
                <Select value={formData.item_id} onValueChange={(val) => setFormData({ ...formData, item_id: val })} required>
                  <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                  <SelectContent>
                    {itemsData?.items?.map((item: any) => (
                      <SelectItem key={item.id} value={item.id}>{item.name} (Stock: {item.current_stock})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Issued To Type *</Label>
                <Select value={formData.issued_to_type} onValueChange={(val) => setFormData({ ...formData, issued_to_type: val })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="teacher">Teacher</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="department">Department</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Issued To Name *</Label>
                <Input value={formData.issued_to_name} onChange={(e) => setFormData({ ...formData, issued_to_name: e.target.value })} required />
              </div>
              <div>
                <Label>Quantity *</Label>
                <Input type="number" min="1" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })} required />
              </div>
              <div>
                <Label>Issue Date</Label>
                <Input type="date" value={formData.issue_date} onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })} />
              </div>
              <div>
                <Label>Expected Return Date (Leave empty for permanent sale/distribution)</Label>
                <Input type="date" value={formData.expected_return_date} onChange={(e) => setFormData({ ...formData, expected_return_date: e.target.value })} placeholder="Optional - leave empty for permanent" />
              </div>
              <div>
                <Label>Purpose</Label>
                <Input value={formData.purpose} onChange={(e) => setFormData({ ...formData, purpose: e.target.value })} placeholder="e.g., distribution, sale, loan" />
              </div>
              <Button type="submit" className="w-full">Issue Item</Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="active">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="active">Active ({activeIssuances.length})</TabsTrigger>
            <TabsTrigger value="overdue">Overdue ({overdueIssuances.length})</TabsTrigger>
            <TabsTrigger value="permanent">Sold/Permanent ({permanentIssuances.length})</TabsTrigger>
            <TabsTrigger value="returned">Returned ({returnedIssuances.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-3">
            {activeIssuances.map((issuance: any) => (
              <div key={issuance.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-medium">{issuance.item?.name}</h3>
                    <p className="text-sm text-gray-600">Issued to: {issuance.issued_to_name} ({issuance.issued_to_type})</p>
                  </div>
                  <ArrowRightLeft className="h-5 w-5 text-blue-500" />
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <p>Quantity: <span className="font-medium">{issuance.quantity}</span></p>
                  <p>Issued: {new Date(issuance.issue_date).toLocaleDateString()}</p>
                  {issuance.expected_return_date && (
                    <p className="col-span-2">Expected Return: {new Date(issuance.expected_return_date).toLocaleDateString()}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleReturn(issuance, 'good')} className="flex-1">
                    <CheckCircle className="h-3 w-3 mr-1" /> Return (Good)
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleReturn(issuance, 'damaged')} className="flex-1">
                    Return (Damaged)
                  </Button>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="overdue" className="space-y-3">
            {overdueIssuances.map((issuance: any) => (
              <div key={issuance.id} className="border border-red-300 bg-red-50 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-medium text-red-700">{issuance.item?.name}</h3>
                    <p className="text-sm text-red-600">Issued to: {issuance.issued_to_name}</p>
                  </div>
                  <Clock className="h-5 w-5 text-red-500" />
                </div>
                <p className="text-sm text-red-600 mb-3">
                  Overdue since: {new Date(issuance.expected_return_date).toLocaleDateString()}
                </p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleReturn(issuance, 'good')} className="flex-1">
                    Return (Good)
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleReturn(issuance, 'damaged')} className="flex-1">
                    Return (Damaged)
                  </Button>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="permanent" className="space-y-3">
            {permanentIssuances.map((issuance: any) => (
              <div key={issuance.id} className="border bg-purple-50 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-medium text-purple-700">{issuance.item?.name}</h3>
                    <p className="text-sm text-purple-600">Sold/Distributed to: {issuance.issued_to_name}</p>
                  </div>
                  <Package className="h-5 w-5 text-purple-500" />
                </div>
                <div className="text-sm text-purple-600">
                  <p>Quantity: <span className="font-medium">{issuance.quantity}</span></p>
                  <p>Date: {new Date(issuance.issue_date).toLocaleDateString()}</p>
                  {issuance.purpose && <p>Purpose: <span className="font-medium">{issuance.purpose}</span></p>}
                  <p className="text-xs mt-2 text-purple-500">No return expected - Permanent sale/distribution</p>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="returned" className="space-y-3">
            {returnedIssuances.map((issuance: any) => (
              <div key={issuance.id} className="border bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-medium text-gray-700">{issuance.item?.name}</h3>
                    <p className="text-sm text-gray-600">Issued to: {issuance.issued_to_name}</p>
                  </div>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div className="text-sm text-gray-600">
                  <p>Issued: {new Date(issuance.issue_date).toLocaleDateString()}</p>
                  <p>Returned: {new Date(issuance.actual_return_date).toLocaleDateString()}</p>
                  <p>Condition: <span className="font-medium capitalize">{issuance.return_condition}</span></p>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
