'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

interface FeeCategory {
  id: string;
  name: string;
  description: string;
}

interface Class {
  grade: string;
  sections: string[];
  total_students: number;
}

interface FeeStructure {
  id: string;
  grade: string;
  academic_year: string;
  fee_category_id: string;
  amount: number;
  payment_frequency: string;
  late_fee_amount?: number;
  late_fee_days?: number;
  is_active: boolean;
  fee_categories?: FeeCategory;
}

interface FeeStructureFormData {
  grade: string;
  academic_year: string;
  fee_category_id: string;
  amount: string;
  payment_frequency: string;
  late_fee_amount: string;
  late_fee_days: string;
  is_active: boolean;
}

interface FeeStructureManagerProps {
  schoolId: string;
  onDataChange?: () => void;
}

export default function FeeStructureManager({ schoolId, onDataChange }: FeeStructureManagerProps) {
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [categories, setCategories] = useState<FeeCategory[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();
  const academicYears = [
    `${currentYear}-${currentYear + 1}`,
    `${currentYear + 1}-${currentYear + 2}`,
    `${currentYear - 1}-${currentYear}`
  ];

  const [formData, setFormData] = useState<FeeStructureFormData>({
    grade: '',
    academic_year: academicYears[0],
    fee_category_id: '',
    amount: '',
    payment_frequency: 'yearly',
    late_fee_amount: '0',
    late_fee_days: '0',
    is_active: true
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [structuresRes, categoriesRes, classesRes] = await Promise.all([
        fetch(`/api/admin/fees/structures?school_id=${schoolId}`),
        fetch(`/api/admin/fees/categories?school_id=${schoolId}`),
        fetch(`/api/admin/classes?school_id=${schoolId}`)
      ]);

      const [structuresData, categoriesData, classesData] = await Promise.all([
        structuresRes.ok ? structuresRes.json() : { data: [] },
        categoriesRes.ok ? categoriesRes.json() : { data: [] },
        classesRes.ok ? classesRes.json() : { data: [] }
      ]);

      setStructures(structuresData.data || []);
      setCategories(categoriesData.data || []);
      setClasses(classesData.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load fee structures');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (schoolId) {
      loadData();
    }
  }, [schoolId]);

  const resetForm = () => {
    setFormData({
      grade: '',
      academic_year: academicYears[0],
      fee_category_id: '',
      amount: '',
      payment_frequency: 'yearly',
      late_fee_amount: '0',
      late_fee_days: '0',
      is_active: true
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (structure: FeeStructure) => {
    setFormData({
      grade: structure.grade,
      academic_year: structure.academic_year,
      fee_category_id: structure.fee_category_id,
      amount: structure.amount.toString(),
      payment_frequency: structure.payment_frequency,
      late_fee_amount: (structure.late_fee_amount || 0).toString(),
      late_fee_days: (structure.late_fee_days || 0).toString(),
      is_active: structure.is_active
    });
    setEditingId(structure.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this fee structure?')) {
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/fees/structures/${id}?school_id=${schoolId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Fee structure deleted successfully');
        await loadData();
        onDataChange?.();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete fee structure');
      }
    } catch (error) {
      console.error('Error deleting structure:', error);
      toast.error('Failed to delete fee structure');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.grade || !formData.fee_category_id || !formData.amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        grade: formData.grade,
        academic_year: formData.academic_year,
        fee_category_id: formData.fee_category_id,
        amount: parseFloat(formData.amount),
        payment_frequency: formData.payment_frequency,
        late_fee_amount: parseFloat(formData.late_fee_amount) || 0,
        late_fee_days: parseInt(formData.late_fee_days) || 0,
        late_fee_type: 'fixed',
        is_active: formData.is_active
      };

      const url = editingId
        ? `/api/admin/fees/structures/${editingId}?school_id=${schoolId}`
        : `/api/admin/fees/structures?school_id=${schoolId}`;

      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        toast.success(`Fee structure ${editingId ? 'updated' : 'created'} successfully`);
        resetForm();
        await loadData();
        onDataChange?.();
      } else {
        const error = await response.json();
        toast.error(error.error || `Failed to ${editingId ? 'update' : 'create'} fee structure`);
      }
    } catch (error) {
      console.error('Error saving structure:', error);
      toast.error('Failed to save fee structure');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-blue-600">Fee Structure Configuration</h3>
          <p className="text-muted-foreground">Configure fee amounts for each class and category</p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700"
          disabled={categories.length === 0 || classes.length === 0}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Structure
        </Button>
      </div>

      {categories.length === 0 && (
        <Card className="border-yellow-500 bg-yellow-50">
          <CardContent className="p-4">
            <p className="text-sm text-yellow-800">
              Please create fee types first before adding fee structures.
            </p>
          </CardContent>
        </Card>
      )}

      {classes.length === 0 && categories.length > 0 && (
        <Card className="border-yellow-500 bg-yellow-50">
          <CardContent className="p-4">
            <p className="text-sm text-yellow-800">
              No classes found. Please add students with class information first.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Fee Structures Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700 text-white">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Class</th>
                  <th className="px-4 py-3 text-left font-medium">Academic Year</th>
                  <th className="px-4 py-3 text-left font-medium">Fee Type</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="px-4 py-3 text-left font-medium">Frequency</th>
                  <th className="px-4 py-3 text-left font-medium">Late Fee</th>
                  <th className="px-4 py-3 text-center font-medium">Status</th>
                  <th className="px-4 py-3 text-center font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {structures.map((structure) => (
                  <tr key={structure.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">Class {structure.grade}</td>
                    <td className="px-4 py-3">{structure.academic_year}</td>
                    <td className="px-4 py-3">{structure.fee_categories?.name || 'N/A'}</td>
                    <td className="px-4 py-3 text-right font-mono">₹{structure.amount.toLocaleString()}</td>
                    <td className="px-4 py-3 capitalize">{structure.payment_frequency}</td>
                    <td className="px-4 py-3">
                      {structure.late_fee_amount ? `₹${structure.late_fee_amount} after ${structure.late_fee_days} days` : 'None'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={structure.is_active ? 'default' : 'secondary'}>
                        {structure.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-green-600 hover:bg-green-50"
                          onClick={() => handleEdit(structure)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                          onClick={() => handleDelete(structure.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {structures.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      No fee structures found. Click "New Structure" to add your first fee structure.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{editingId ? 'Edit' : 'Add'} Fee Structure</CardTitle>
                  <CardDescription>
                    {editingId ? 'Update the fee structure details' : 'Create a new fee structure configuration'}
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={resetForm}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="grade">Class/Grade *</Label>
                  <Select
                    value={formData.grade}
                    onValueChange={(value) => setFormData({ ...formData, grade: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((cls) => (
                        <SelectItem key={cls.grade} value={cls.grade}>
                          Class {cls.grade} ({cls.total_students} students)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="academic_year">Academic Year *</Label>
                  <Select
                    value={formData.academic_year}
                    onValueChange={(value) => setFormData({ ...formData, academic_year: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {academicYears.map((year) => (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="fee_category">Fee Type *</Label>
                  <Select
                    value={formData.fee_category_id}
                    onValueChange={(value) => setFormData({ ...formData, fee_category_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select fee type" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="amount">Amount (₹) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="Enter amount"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="payment_frequency">Payment Frequency *</Label>
                  <Select
                    value={formData.payment_frequency}
                    onValueChange={(value) => setFormData({ ...formData, payment_frequency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="half_yearly">Half Yearly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                      <SelectItem value="one_time">One Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="late_fee_amount">Late Fee Amount (₹)</Label>
                  <Input
                    id="late_fee_amount"
                    type="number"
                    placeholder="0"
                    value={formData.late_fee_amount}
                    onChange={(e) => setFormData({ ...formData, late_fee_amount: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="late_fee_days">Late Fee After (days)</Label>
                  <Input
                    id="late_fee_days"
                    type="number"
                    placeholder="0"
                    value={formData.late_fee_days}
                    onChange={(e) => setFormData({ ...formData, late_fee_days: e.target.value })}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="is_active" className="font-normal cursor-pointer">
                    Active
                  </Label>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSubmit} disabled={saving} className="bg-green-600 hover:bg-green-700">
                  {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
                </Button>
                <Button variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
