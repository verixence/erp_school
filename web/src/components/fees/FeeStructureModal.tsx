'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase-client';

interface FeeCategory {
  id: string;
  name: string;
  description: string;
}

interface FeeStructure {
  id: string;
  fee_category_id: string;
  amount: number;
  payment_frequency: string;
  late_fee_amount?: number;
  fee_categories?: FeeCategory;
}

interface FeeItem {
  fee_category_id: string;
  amount: string;
}

interface FeeStructureModalProps {
  schoolId: string;
  grade: string | null;
  academicYear: string | null;
  mode: 'view' | 'edit';
  onClose: () => void;
}

export default function FeeStructureModal({ schoolId, grade, academicYear, mode, onClose }: FeeStructureModalProps) {
  const [selectedClass, setSelectedClass] = useState(grade || '');
  const [selectedYear, setSelectedYear] = useState(academicYear || '');
  const [feeItems, setFeeItems] = useState<FeeItem[]>([]);
  const [categories, setCategories] = useState<FeeCategory[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const currentYear = new Date().getFullYear();
  const academicYears = [
    `${currentYear}-${currentYear + 1}`,
    `${currentYear + 1}-${currentYear + 2}`,
    `${currentYear - 1}-${currentYear}`
  ];

  const loadData = async () => {
    setLoading(true);
    try {
      // Load categories from API
      const categoriesRes = await fetch(`/api/admin/fees/categories?school_id=${schoolId}`);
      const categoriesData = categoriesRes.ok ? await categoriesRes.json() : { data: [] };

      // Load sections directly from Supabase client (same as student form)
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('sections')
        .select('id, grade, grade_text, section')
        .eq('school_id', schoolId)
        .order('grade', { ascending: true, nullsFirst: false })
        .order('grade_text', { ascending: true, nullsFirst: false })
        .order('section');

      if (sectionsError) {
        console.error('Error fetching sections:', sectionsError);
      }

      // Extract unique grades from sections (use grade_text for text grades like NURSERY, or grade for numeric)
      const uniqueGrades = sectionsData
        ? [...new Set(sectionsData.map(s => {
            const gradeValue = s.grade_text || s.grade?.toString();
            return gradeValue;
          }).filter(Boolean))]
        : [];

      // Sort grades properly - text grades first, then numeric
      uniqueGrades.sort((a, b) => {
        const numA = parseInt(a!.replace(/[^0-9]/g, ''));
        const numB = parseInt(b!.replace(/[^0-9]/g, ''));

        // Both are text grades
        if (isNaN(numA) && isNaN(numB)) return a!.localeCompare(b!);
        // a is text, b is numeric - text grades come first
        if (isNaN(numA)) return -1;
        // a is numeric, b is text - numeric grades come after
        if (isNaN(numB)) return 1;
        // Both are numeric
        return numA - numB;
      });

      const classesWithGrades = uniqueGrades.map(grade => ({ grade: grade! }));

      console.log('Loaded sections:', sectionsData);
      console.log('Extracted grades:', uniqueGrades);
      console.log('Loaded categories:', categoriesData.data);

      setCategories(categoriesData.data || []);
      setClasses(classesWithGrades);

      // If editing existing, load current structures
      if (selectedClass && selectedYear) {
        const structuresRes = await fetch(
          `/api/admin/fees/structures?school_id=${schoolId}&grade=${selectedClass}&academic_year=${selectedYear}`
        );
        if (structuresRes.ok) {
          const structuresData = await structuresRes.json();
          const structures: FeeStructure[] = structuresData.data || [];

          const items = structures.map(s => ({
            fee_category_id: s.fee_category_id,
            amount: s.amount.toString()
          }));

          setFeeItems(items);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [schoolId, selectedClass, selectedYear]);

  const addFeeItem = () => {
    setFeeItems([...feeItems, { fee_category_id: '', amount: '' }]);
  };

  const removeFeeItem = (index: number) => {
    setFeeItems(feeItems.filter((_, i) => i !== index));
  };

  const updateFeeItem = (index: number, field: keyof FeeItem, value: string) => {
    const newItems = [...feeItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setFeeItems(newItems);
  };

  const calculateTotal = () => {
    return feeItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  };

  const handleSave = async () => {
    if (!selectedClass || !selectedYear) {
      toast.error('Please select class and academic year');
      return;
    }

    const validItems = feeItems.filter(item => item.fee_category_id && item.amount);
    if (validItems.length === 0) {
      toast.error('Please add at least one fee type');
      return;
    }

    setSaving(true);
    try {
      // First, delete existing structures for this class/year
      const existingRes = await fetch(
        `/api/admin/fees/structures?school_id=${schoolId}&grade=${selectedClass}&academic_year=${selectedYear}`
      );

      if (existingRes.ok) {
        const existingData = await existingRes.json();
        const existing: FeeStructure[] = existingData.data || [];

        // Delete each existing structure
        await Promise.all(
          existing.map(s =>
            fetch(`/api/admin/fees/structures/${s.id}?school_id=${schoolId}`, {
              method: 'DELETE'
            })
          )
        );
      }

      // Create new structures
      const createPromises = validItems.map(item =>
        fetch(`/api/admin/fees/structures?school_id=${schoolId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            grade: selectedClass,
            academic_year: selectedYear,
            fee_category_id: item.fee_category_id,
            amount: parseFloat(item.amount),
            payment_frequency: 'yearly',
            late_fee_amount: 0,
            late_fee_days: 0,
            late_fee_type: 'fixed',
            is_active: true
          })
        })
      );

      const results = await Promise.all(createPromises);
      const allSuccessful = results.every(r => r.ok);

      if (allSuccessful) {
        toast.success('Fee structure saved successfully');
        onClose();
      } else {
        toast.error('Some fee structures failed to save');
      }
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Failed to save fee structure');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <Card className="w-full max-w-4xl mx-4">
          <CardContent className="p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isViewOnly = mode === 'view';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-blue-600">Fee Structure Info</CardTitle>
              <CardDescription>
                {isViewOnly ? 'View fee structure details' : 'Configure fee structure for the class'}
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Class and Year Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="class">Select Class*</Label>
              <Select
                value={selectedClass}
                onValueChange={setSelectedClass}
                disabled={isViewOnly || (grade !== null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="---Select Class---" />
                </SelectTrigger>
                <SelectContent>
                  {classes.length === 0 ? (
                    <SelectItem value="no-classes" disabled>
                      No classes found
                    </SelectItem>
                  ) : (
                    classes.map((cls) => (
                      <SelectItem key={cls.grade} value={cls.grade}>
                        Class {cls.grade}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="academic-year">Academic Year*</Label>
              <Select
                value={selectedYear}
                onValueChange={setSelectedYear}
                disabled={isViewOnly || (academicYear !== null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Year" />
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
          </div>

          {/* Fee Types Table */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-700 text-white">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Fee Type</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  {!isViewOnly && <th className="px-4 py-3 text-center font-medium">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {feeItems.map((item, index) => (
                  <tr key={index}>
                    <td className="px-4 py-3">
                      {isViewOnly ? (
                        <span>{categories.find(c => c.id === item.fee_category_id)?.name || 'N/A'}</span>
                      ) : (
                        <Select
                          value={item.fee_category_id}
                          onValueChange={(value) => updateFeeItem(index, 'fee_category_id', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="---Select Fee Type---" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isViewOnly ? (
                        <span className="text-right block">{parseFloat(item.amount).toFixed(2)}</span>
                      ) : (
                        <Input
                          type="number"
                          placeholder="0.00"
                          className="text-right"
                          value={item.amount}
                          onChange={(e) => updateFeeItem(index, 'amount', e.target.value)}
                        />
                      )}
                    </td>
                    {!isViewOnly && (
                      <td className="px-4 py-3 text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                          onClick={() => removeFeeItem(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
                {!isViewOnly && (
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-center">
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-green-600 text-white hover:bg-green-700"
                        onClick={addFeeItem}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Fee Type
                      </Button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Total Amount Section */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-700 text-white">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Fee Type</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  {!isViewOnly && <th className="px-4 py-3 text-center font-medium">Action</th>}
                </tr>
              </thead>
              <tbody>
                <tr className="bg-slate-100">
                  <td className="px-4 py-3 font-bold">Total Amount</td>
                  <td className="px-4 py-3 text-right font-bold">{calculateTotal().toFixed(2)}</td>
                  {!isViewOnly && <td className="px-4 py-3"></td>}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              ← Back
            </Button>
            {!isViewOnly && (
              <Button
                onClick={handleSave}
                disabled={saving || !selectedClass || !selectedYear || feeItems.length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                {saving ? 'Saving...' : '💾 Save'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
