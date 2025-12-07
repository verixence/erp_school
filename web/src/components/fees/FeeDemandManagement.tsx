'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase-client';
import { formatIndianCurrency } from '@/lib/utils';

interface Student {
  id: string;
  full_name: string;
  admission_no: string;
  grade: string;
  section: string;
}

interface FeeStructure {
  id: string;
  fee_category_id: string;
  amount: number;
  fee_categories?: {
    id: string;
    name: string;
  } | {
    id: string;
    name: string;
  }[];
}

interface FeeDemand {
  id?: string;
  fee_structure_id: string;
  original_amount: number;
  adjustment_type: 'discount' | 'increase';
  adjustment_amount: number;
  adjustment_reason: string;
  demand_amount: number;
}

interface FeeDemandManagementProps {
  schoolId: string;
}

export default function FeeDemandManagement({ schoolId }: FeeDemandManagementProps) {
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('');

  const [classes, setClasses] = useState<Array<{ grade: string }>>([]);
  const [sections, setSections] = useState<Array<{ section: string }>>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [demands, setDemands] = useState<Map<string, FeeDemand>>(new Map());
  const [originalDemands, setOriginalDemands] = useState<Map<string, FeeDemand>>(new Map()); // Track original values
  const [modifiedDemands, setModifiedDemands] = useState<Set<string>>(new Set()); // Track which demands changed

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const currentYear = new Date().getFullYear();
  const academicYears = [
    `${currentYear}-${currentYear + 1}`,
    `${currentYear + 1}-${currentYear + 2}`,
    `${currentYear - 1}-${currentYear}`
  ];

  // Load classes
  useEffect(() => {
    loadClasses();
  }, [schoolId]);

  // Load sections when class changes
  useEffect(() => {
    if (selectedClass) {
      loadSections();
    } else {
      setSections([]);
      setSelectedSection('');
    }
  }, [selectedClass, schoolId]);

  // Load students when section changes
  useEffect(() => {
    if (selectedClass && selectedSection) {
      loadStudents();
    } else {
      setStudents([]);
      setSelectedStudent('');
    }
  }, [selectedClass, selectedSection, schoolId]);

  const loadClasses = async () => {
    try {
      // Get unique grades from students table directly (which uses TEXT grade column)
      const { data: studentsData } = await supabase
        .from('students')
        .select('grade')
        .eq('school_id', schoolId)
        .not('grade', 'is', null);

      if (studentsData) {
        // Extract unique grades
        const uniqueGrades = [...new Set(studentsData.map(s => s.grade).filter(Boolean))];

        // Sort text grades (NURSERY, LKG, UKG) first, then numeric grades
        uniqueGrades.sort((a, b) => {
          const numA = parseInt(a!.replace(/[^0-9]/g, ''));
          const numB = parseInt(b!.replace(/[^0-9]/g, ''));

          // Both are text grades
          if (isNaN(numA) && isNaN(numB)) return a!.localeCompare(b!);
          // a is text, b is numeric - text comes first
          if (isNaN(numA)) return -1;
          // a is numeric, b is text - text comes first
          if (isNaN(numB)) return 1;
          // Both are numeric
          return numA - numB;
        });

        setClasses(uniqueGrades.map(grade => ({ grade: grade! })));
      }
    } catch (error) {
      console.error('Error loading classes:', error);
    }
  };

  const loadSections = async () => {
    try {
      // Get unique sections from students table for the selected grade
      const { data: studentsData } = await supabase
        .from('students')
        .select('section')
        .eq('school_id', schoolId)
        .eq('grade', selectedClass)
        .not('section', 'is', null);

      if (studentsData) {
        const uniqueSections = [...new Set(studentsData.map(s => s.section).filter(Boolean))];
        uniqueSections.sort();
        setSections(uniqueSections.map(section => ({ section: section! })));
      }
    } catch (error) {
      console.error('Error loading sections:', error);
    }
  };

  const loadStudents = async () => {
    try {
      const { data: studentsData } = await supabase
        .from('students')
        .select('id, full_name, admission_no, grade, section')
        .eq('school_id', schoolId)
        .eq('grade', selectedClass)
        .eq('section', selectedSection)
        .eq('status', 'active')
        .order('full_name');

      setStudents(studentsData || []);
    } catch (error) {
      console.error('Error loading students:', error);
      toast.error('Failed to load students');
    }
  };

  const handleSearch = async () => {
    if (!selectedStudent || !selectedAcademicYear) {
      toast.error('Please select student and academic year');
      return;
    }

    setLoading(true);
    try {
      // Load fee structures for this class and academic year (case-insensitive)
      const { data: structuresData } = await supabase
        .from('fee_structures')
        .select(`
          id,
          fee_category_id,
          amount,
          fee_categories (
            id,
            name
          )
        `)
        .eq('school_id', schoolId)
        .ilike('grade', selectedClass)
        .eq('academic_year', selectedAcademicYear)
        .eq('is_active', true);

      setFeeStructures(structuresData || []);

      // Load existing fee demands for this student
      const response = await fetch(
        `/api/admin/fees/demands?school_id=${schoolId}&student_id=${selectedStudent}&academic_year=${selectedAcademicYear}`
      );

      if (response.ok) {
        const data = await response.json();
        const demandsMap = new Map<string, FeeDemand>();

        (data.data || []).forEach((demand: any) => {
          demandsMap.set(demand.fee_structure_id, {
            id: demand.id,
            fee_structure_id: demand.fee_structure_id,
            original_amount: parseFloat(demand.original_amount) || 0,
            adjustment_type: demand.adjustment_type || 'discount',
            adjustment_amount: parseFloat(demand.adjustment_amount) || 0,
            adjustment_reason: demand.adjustment_reason || '',
            demand_amount: parseFloat(demand.demand_amount) || 0
          });
        });

        // Initialize demands for structures that don't have custom demands yet
        (structuresData || []).forEach((structure: any) => {
          if (!demandsMap.has(structure.id)) {
            const amount = parseFloat(structure.amount) || 0;
            demandsMap.set(structure.id, {
              fee_structure_id: structure.id,
              original_amount: amount,
              adjustment_type: 'discount',
              adjustment_amount: 0,
              adjustment_reason: '',
              demand_amount: amount
            });
          }
        });

        setDemands(demandsMap);
        // Store original values for change tracking
        setOriginalDemands(new Map(demandsMap));
        // Clear modified set when loading new data
        setModifiedDemands(new Set());
      }
    } catch (error) {
      console.error('Error loading fee demands:', error);
      toast.error('Failed to load fee demands');
    } finally {
      setLoading(false);
    }
  };

  const updateDemand = (feeStructureId: string, field: 'adjustment_type' | 'adjustment_amount' | 'adjustment_reason', value: string | number) => {
    const newDemands = new Map(demands);
    const demand = newDemands.get(feeStructureId);

    if (demand) {
      const updatedDemand = { ...demand };

      if (field === 'adjustment_type') {
        updatedDemand.adjustment_type = value as 'discount' | 'increase';
        // Recalculate demand_amount based on new type
        if (updatedDemand.adjustment_type === 'discount') {
          updatedDemand.demand_amount = updatedDemand.original_amount - updatedDemand.adjustment_amount;
        } else {
          updatedDemand.demand_amount = updatedDemand.original_amount + updatedDemand.adjustment_amount;
        }
      } else if (field === 'adjustment_amount') {
        updatedDemand.adjustment_amount = Number(value);
        // Recalculate demand_amount based on type
        if (updatedDemand.adjustment_type === 'discount') {
          updatedDemand.demand_amount = updatedDemand.original_amount - updatedDemand.adjustment_amount;
        } else {
          updatedDemand.demand_amount = updatedDemand.original_amount + updatedDemand.adjustment_amount;
        }
      } else {
        updatedDemand.adjustment_reason = value as string;
      }

      newDemands.set(feeStructureId, updatedDemand);
      setDemands(newDemands);

      // Mark this demand as modified
      const newModified = new Set(modifiedDemands);
      newModified.add(feeStructureId);
      setModifiedDemands(newModified);
    }
  };

  const handleSave = async () => {
    if (!selectedStudent || !selectedAcademicYear) {
      toast.error('Please select student and academic year');
      return;
    }

    // Only send modified demands for better performance
    if (modifiedDemands.size === 0) {
      toast.info('No changes to save');
      return;
    }

    setSaving(true);
    try {
      // Only include demands that were actually modified
      const demandsArray = Array.from(modifiedDemands)
        .map(feeStructureId => {
          const demand = demands.get(feeStructureId);
          if (!demand) return null;

          return {
            id: demand.id, // Include ID if updating existing demand
            student_id: selectedStudent,
            fee_structure_id: demand.fee_structure_id,
            academic_year: selectedAcademicYear,
            original_amount: demand.original_amount,
            adjustment_type: demand.adjustment_type,
            adjustment_amount: demand.adjustment_amount,
            adjustment_reason: demand.adjustment_reason || '',
            demand_amount: demand.demand_amount
          };
        })
        .filter(Boolean);

      console.log(`Saving ${demandsArray.length} modified demands (out of ${demands.size} total)`);

      const response = await fetch(`/api/admin/fees/demands?school_id=${schoolId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ demands: demandsArray })
      });

      if (response.ok) {
        toast.success(`Successfully saved ${demandsArray.length} fee demand(s)`);
        // Reload data to get updated values
        await handleSearch();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to save fee demands');
      }
    } catch (error) {
      console.error('Error saving fee demands:', error);
      toast.error('Failed to save fee demands');
    } finally {
      setSaving(false);
    }
  };

  const selectedStudentData = students.find(s => s.id === selectedStudent);

  const totalOriginal = Array.from(demands.values()).reduce((sum, d) => sum + d.original_amount, 0);
  const totalAdjustment = Array.from(demands.values()).reduce((sum, d) => {
    return sum + (d.adjustment_type === 'discount' ? -d.adjustment_amount : d.adjustment_amount);
  }, 0);
  const totalDemand = Array.from(demands.values()).reduce((sum, d) => sum + d.demand_amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-blue-600">Fee Demand Management</h3>
        <p className="text-muted-foreground">Customize fee amounts with discounts or additional charges for individual students</p>
      </div>

      {/* Search Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div>
              <Label htmlFor="search-class">Search by Class</Label>
              <Select value={selectedClass || undefined} onValueChange={setSelectedClass}>
                <SelectTrigger id="search-class">
                  <SelectValue placeholder="---All---" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.grade} value={cls.grade}>
                      Class {cls.grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="search-section">Search by Section</Label>
              <Select value={selectedSection || undefined} onValueChange={setSelectedSection} disabled={!selectedClass}>
                <SelectTrigger id="search-section">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  {sections.map((sec) => (
                    <SelectItem key={sec.section} value={sec.section}>
                      Section {sec.section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="search-student">Search by Student</Label>
              <Select value={selectedStudent || undefined} onValueChange={setSelectedStudent} disabled={!selectedSection}>
                <SelectTrigger id="search-student">
                  <SelectValue placeholder="---Select Student---" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.full_name} - {student.admission_no}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="academic-year">Academic Year</Label>
              <Select value={selectedAcademicYear} onValueChange={setSelectedAcademicYear}>
                <SelectTrigger id="academic-year">
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

            <div>
              <Button
                onClick={handleSearch}
                disabled={!selectedStudent || !selectedAcademicYear || loading}
                className="w-full bg-blue-500 hover:bg-blue-600"
              >
                <Search className="h-4 w-4 mr-2" />
                {loading ? 'Loading...' : 'Search'}
              </Button>
            </div>
          </div>

          {selectedStudentData && demands.size > 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-900">
                Student: {selectedStudentData.full_name} ({selectedStudentData.admission_no}) - Class {selectedStudentData.grade} {selectedStudentData.section}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fee Details Table */}
      {demands.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Fee Details</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-700 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Fee Type</th>
                    <th className="px-4 py-3 text-right font-medium">Original Amount</th>
                    <th className="px-4 py-3 text-left font-medium">Adjustment Type</th>
                    <th className="px-4 py-3 text-right font-medium">Adjustment Amount</th>
                    <th className="px-4 py-3 text-left font-medium">Reason</th>
                    <th className="px-4 py-3 text-right font-medium">Demand Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {feeStructures.map((structure) => {
                    const demand = demands.get(structure.id);
                    if (!demand) return null;

                    const feeCategoryName = structure.fee_categories
                      ? Array.isArray(structure.fee_categories)
                        ? structure.fee_categories[0]?.name || 'Unknown'
                        : structure.fee_categories.name
                      : 'Unknown';

                    return (
                      <tr key={structure.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{feeCategoryName}</td>
                        <td className="px-4 py-3 text-right font-mono">
                          {formatIndianCurrency(demand.original_amount || 0)}
                        </td>
                        <td className="px-4 py-3">
                          <Select
                            value={demand.adjustment_type}
                            onValueChange={(value) => updateDemand(structure.id, 'adjustment_type', value)}
                          >
                            <SelectTrigger className="w-[160px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="discount">Discount</SelectItem>
                              <SelectItem value="increase">Additional Charge</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            className="text-right font-mono"
                            value={demand.adjustment_amount ?? 0}
                            onChange={(e) => updateDemand(structure.id, 'adjustment_amount', e.target.value)}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="text"
                            placeholder="Enter reason (optional)"
                            value={demand.adjustment_reason ?? ''}
                            onChange={(e) => updateDemand(structure.id, 'adjustment_reason', e.target.value)}
                          />
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-medium">
                          {formatIndianCurrency(demand.demand_amount || 0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-100 font-bold">
                  <tr>
                    <td className="px-4 py-3">Total Amount</td>
                    <td className="px-4 py-3 text-right font-mono">{formatIndianCurrency(totalOriginal)}</td>
                    <td className="px-4 py-3"></td>
                    <td className="px-4 py-3 text-right font-mono">
                      <span className={totalAdjustment < 0 ? 'text-green-600' : totalAdjustment > 0 ? 'text-red-600' : ''}>
                        {totalAdjustment < 0 ? '-' : '+'}{formatIndianCurrency(Math.abs(totalAdjustment))}
                      </span>
                    </td>
                    <td className="px-4 py-3"></td>
                    <td className="px-4 py-3 text-right font-mono">{formatIndianCurrency(totalDemand)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      {demands.size > 0 && (
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-green-600 hover:bg-green-700 px-8"
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      )}
    </div>
  );
}
