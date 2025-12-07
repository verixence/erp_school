'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, FileDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase-client';

interface FeeStatusExportProps {
  schoolId: string;
}

export default function FeeStatusExport({ schoolId }: FeeStatusExportProps) {
  const [paymentStatus, setPaymentStatus] = useState('all');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [academicYear, setAcademicYear] = useState('2024-2025');
  const [viewType, setViewType] = useState<'summary' | 'detailed'>('summary');
  const [exporting, setExporting] = useState(false);

  const [classes, setClasses] = useState<Array<{ grade: string }>>([]);
  const [sections, setSections] = useState<Array<{ section: string }>>([]);

  // Load classes on mount
  useEffect(() => {
    loadClasses();
  }, [schoolId]);

  // Load sections when grade changes
  useEffect(() => {
    if (gradeFilter && gradeFilter !== 'all') {
      loadSections();
    } else {
      setSections([]);
      setSectionFilter('all');
    }
  }, [gradeFilter, schoolId]);

  const loadClasses = async () => {
    try {
      // Try sections table first
      let { data: sectionsData } = await supabase
        .from('sections')
        .select('grade')
        .eq('school_id', schoolId)
        .order('grade');

      // Fall back to students table if sections is empty
      if (!sectionsData || sectionsData.length === 0) {
        const { data: studentsData } = await supabase
          .from('students')
          .select('grade')
          .eq('school_id', schoolId)
          .eq('status', 'active');

        sectionsData = studentsData;
      }

      if (sectionsData) {
        const uniqueGrades = [...new Set(sectionsData.map(s => s.grade?.toString()).filter(Boolean))];
        uniqueGrades.sort((a, b) => {
          const numA = parseInt(a!.replace(/[^0-9]/g, '')) || 0;
          const numB = parseInt(b!.replace(/[^0-9]/g, '')) || 0;
          if (numA && numB) return numA - numB;
          return a!.localeCompare(b!);
        });
        setClasses(uniqueGrades.map(grade => ({ grade: grade! })));
      }
    } catch (error) {
      console.error('Error loading classes:', error);
    }
  };

  const loadSections = async () => {
    try {
      // Determine if gradeFilter is numeric or text (for pre-primary grades like LKG, UKG)
      const isNumericGrade = !isNaN(Number(gradeFilter));

      // Try sections table first
      let query = supabase
        .from('sections')
        .select('section')
        .eq('school_id', schoolId);

      // Filter by appropriate column based on grade type
      if (isNumericGrade) {
        query = query.eq('grade', parseInt(gradeFilter!));
      } else {
        query = query.eq('grade_text', gradeFilter);
      }

      let { data: sectionsData } = await query.order('section');

      // Fall back to students table if sections is empty
      if (!sectionsData || sectionsData.length === 0) {
        const { data: studentsData } = await supabase
          .from('students')
          .select('section')
          .eq('school_id', schoolId)
          .eq('grade', gradeFilter)
          .eq('status', 'active');

        sectionsData = studentsData;
      }

      if (sectionsData) {
        const uniqueSections = [...new Set(sectionsData.map(s => s.section).filter(Boolean))];
        setSections(uniqueSections.map(section => ({ section: section! })));
      }
    } catch (error) {
      console.error('Error loading sections:', error);
    }
  };

  const handleExport = async (format: 'csv' | 'json') => {
    setExporting(true);
    try {
      const params = new URLSearchParams({
        school_id: schoolId,
        format,
        payment_status: paymentStatus,
        academic_year: academicYear,
        view: viewType
      });

      if (gradeFilter !== 'all') {
        params.append('grade', gradeFilter);
      }

      if (sectionFilter !== 'all') {
        params.append('section', sectionFilter);
      }

      const response = await fetch(`/api/admin/fees/export-fee-status?${params.toString()}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Export failed');
      }

      if (format === 'csv') {
        // Download CSV file
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fee-status-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Fee status exported successfully!');
      } else {
        // Download JSON file
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fee-status-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Fee status exported successfully!');
      }
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(error.message || 'Failed to export fee status');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileDown className="h-5 w-5" />
          Export Fee Status
        </CardTitle>
        <CardDescription>
          Export student fee status with applied filters (Paid, Pending, Balance)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <Label htmlFor="view_type">View Type</Label>
            <Select value={viewType} onValueChange={(value: 'summary' | 'detailed') => setViewType(value)}>
              <SelectTrigger id="view_type">
                <SelectValue placeholder="View Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="summary">Summary (One row per student)</SelectItem>
                <SelectItem value="detailed">Detailed (One row per fee type)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="payment_status">Payment Status</Label>
            <Select value={paymentStatus} onValueChange={setPaymentStatus}>
              <SelectTrigger id="payment_status">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Students</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="partial">Partially Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="grade">Grade/Class</Label>
            <Select value={gradeFilter} onValueChange={setGradeFilter}>
              <SelectTrigger id="grade">
                <SelectValue placeholder="All Grades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Grades</SelectItem>
                {classes.map((cls) => (
                  <SelectItem key={cls.grade} value={cls.grade}>
                    {cls.grade}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="section">Section</Label>
            <Select value={sectionFilter} onValueChange={setSectionFilter} disabled={gradeFilter === 'all'}>
              <SelectTrigger id="section">
                <SelectValue placeholder={gradeFilter === 'all' ? 'Select grade first' : 'All Sections'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sections</SelectItem>
                {sections.map((sec) => (
                  <SelectItem key={sec.section} value={sec.section}>
                    {sec.section}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="academic_year">Academic Year</Label>
            <Select value={academicYear} onValueChange={setAcademicYear}>
              <SelectTrigger id="academic_year">
                <SelectValue placeholder="Select Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2024-2025">2024-2025</SelectItem>
                <SelectItem value="2023-2024">2023-2024</SelectItem>
                <SelectItem value="2022-2023">2022-2023</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex gap-4">
          <Button
            onClick={() => handleExport('csv')}
            disabled={exporting}
            className="flex items-center gap-2"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export as CSV
          </Button>

          <Button
            onClick={() => handleExport('json')}
            disabled={exporting}
            variant="outline"
            className="flex items-center gap-2"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export as JSON
          </Button>
        </div>

        {/* Export Info */}
        <div className="text-sm text-muted-foreground space-y-1">
          <p><strong>Exported Data Includes:</strong></p>
          {viewType === 'summary' ? (
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>One row per student</strong> with aggregated totals</li>
              <li>Student details (Name, Admission Number, Grade, Section)</li>
              <li>Total fee amounts (Original, Discount, Demand, Paid, Balance)</li>
              <li>Overall payment status and last updated timestamp</li>
            </ul>
          ) : (
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>One row per student per fee type</strong> with detailed breakdown</li>
              <li>Student details (Name, Admission Number, Grade, Section)</li>
              <li>Individual fee information per type (Tuition, Activity, LMS, etc.)</li>
              <li>Payment status per fee type with due dates</li>
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
