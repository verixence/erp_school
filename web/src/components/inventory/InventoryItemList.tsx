'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Search, Package } from 'lucide-react';

interface InventoryItemListProps {
  schoolId: string;
}

export default function InventoryItemList({ schoolId }: InventoryItemListProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [formData, setFormData] = useState({
    category_id: '',
    item_code: '',
    name: '',
    description: '',
    unit_of_measurement: '',
    minimum_stock_level: 0,
    current_stock: 0,
    unit_price: 0,
    location: '',
    condition: 'good',
    status: 'active',
    purchase_date: '',
    supplier_name: '',
    serial_number: '',
    barcode: '',
    notes: '',
  });
  const queryClient = useQueryClient();

  const { data: categoriesData } = useQuery({
    queryKey: ['inventory-categories', schoolId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/inventory/categories?school_id=${schoolId}`);
      if (!res.ok) throw new Error('Failed to fetch categories');
      return res.json();
    },
  });

  const { data: itemsData, isLoading } = useQuery({
    queryKey: ['inventory-items', schoolId, filterCategory],
    queryFn: async () => {
      const params = new URLSearchParams({ school_id: schoolId });
      if (filterCategory) params.append('category_id', filterCategory);
      const res = await fetch(`/api/admin/inventory/items?${params}`);
      if (!res.ok) throw new Error('Failed to fetch items');
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/admin/inventory/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ school_id: schoolId, ...data }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create item');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-dashboard'] });
      toast.success('Item created successfully');
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/admin/inventory/items', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ school_id: schoolId, ...data }),
      });
      if (!res.ok) throw new Error('Failed to update item');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-dashboard'] });
      toast.success('Item updated successfully');
      setIsDialogOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/inventory/items?id=${id}&school_id=${schoolId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete item');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-dashboard'] });
      toast.success('Item deleted successfully');
    },
  });

  const resetForm = () => {
    setFormData({
      category_id: '',
      item_code: '',
      name: '',
      description: '',
      unit_of_measurement: '',
      minimum_stock_level: 0,
      current_stock: 0,
      unit_price: 0,
      location: '',
      condition: 'good',
      status: 'active',
      purchase_date: '',
      supplier_name: '',
      serial_number: '',
      barcode: '',
      notes: '',
    });
    setEditingItem(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      category_id: item.category_id,
      item_code: item.item_code,
      name: item.name,
      description: item.description || '',
      unit_of_measurement: item.unit_of_measurement || '',
      minimum_stock_level: item.minimum_stock_level,
      current_stock: item.current_stock,
      unit_price: item.unit_price,
      location: item.location || '',
      condition: item.condition,
      status: item.status,
      purchase_date: item.purchase_date || '',
      supplier_name: item.supplier_name || '',
      serial_number: item.serial_number || '',
      barcode: item.barcode || '',
      notes: item.notes || '',
    });
    setIsDialogOpen(true);
  };

  const filteredItems = itemsData?.items?.filter((item: any) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.item_code.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Inventory Items</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit Item' : 'Add New Item'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Category *</Label>
                  <Select value={formData.category_id} onValueChange={(val) => setFormData({ ...formData, category_id: val })} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoriesData?.categories?.map((cat: any) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Item Code *</Label>
                  <Input value={formData.item_code} onChange={(e) => setFormData({ ...formData, item_code: e.target.value })} required />
                </div>
                <div className="col-span-2">
                  <Label>Item Name *</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div>
                  <Label>Unit</Label>
                  <Input value={formData.unit_of_measurement} onChange={(e) => setFormData({ ...formData, unit_of_measurement: e.target.value })} placeholder="pcs, kg, ltr" />
                </div>
                <div>
                  <Label>Location</Label>
                  <Input value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
                </div>
                <div>
                  <Label>Min Stock Level</Label>
                  <Input type="number" value={formData.minimum_stock_level} onChange={(e) => setFormData({ ...formData, minimum_stock_level: parseInt(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label>Current Stock</Label>
                  <Input type="number" value={formData.current_stock} onChange={(e) => setFormData({ ...formData, current_stock: parseInt(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label>Unit Price</Label>
                  <Input type="number" step="0.01" value={formData.unit_price} onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label>Condition</Label>
                  <Select value={formData.condition} onValueChange={(val) => setFormData({ ...formData, condition: val })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="fair">Fair</SelectItem>
                      <SelectItem value="poor">Poor</SelectItem>
                      <SelectItem value="damaged">Damaged</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="retired">Retired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Purchase Date</Label>
                  <Input type="date" value={formData.purchase_date} onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })} />
                </div>
              </div>
              <Button type="submit" className="w-full">{editingItem ? 'Update' : 'Create'} Item</Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input placeholder="Search items..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Categories</SelectItem>
                {categoriesData?.categories?.map((cat: any) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <p className="text-center text-muted-foreground">Loading items...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item: any) => (
                <div key={item.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-medium">{item.name}</h3>
                      <p className="text-sm text-gray-600">{item.item_code}</p>
                    </div>
                    <Package className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="space-y-1 text-sm mb-3">
                    <p>Category: <span className="font-medium">{item.category?.name}</span></p>
                    <p>Stock: <span className={`font-medium ${item.current_stock <= item.minimum_stock_level ? 'text-orange-600' : 'text-green-600'}`}>{item.current_stock} {item.unit_of_measurement}</span></p>
                    <p>Location: {item.location || 'N/A'}</p>
                    <p>Price: ₹{item.unit_price}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(item)} className="flex-1">
                      <Edit className="h-3 w-3 mr-1" /> Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => deleteMutation.mutate(item.id)}>
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
