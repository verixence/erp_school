'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TrendingUp, AlertCircle, Users, Search, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { createClient } from '@/lib/supabase-client';

interface Student {
  id: string;
  full_name: string;
  admission_no: string;
  grade: string;
  section: string;
  status: string;
}

export default function StudentPromotionsPage() {
  const { user } = useAuth();
  const schoolId = user?.school_id;
  const supabase = createClient();

  const [fromYear, setFromYear] = useState('2024-2025');
  const [toYear, setToYear] = useState('2025-2026');
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [targetGrade, setTargetGrade] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [promotionResult, setPromotionResult] = useState<any>(null);

  const academicYears = [
    '2022-2023',
    '2023-2024',
    '2024-2025',
    '2025-2026',
    '2026-2027'
  ];

  const grades = ['NURSERY', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

  // Fetch sections for selected grade
  const { data: sectionsData } = useQuery({
    queryKey: ['sections', schoolId, selectedGrade],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sections')
        .select('id, section, grade, grade_text')
        .eq('school_id', schoolId!)
        .eq('grade', selectedGrade)
        .order('section');

      if (error) throw error;
      return data;
    },
    enabled: !!schoolId && !!selectedGrade
  });

  // Fetch students for selected grade/section
  const { data: studentsData, isLoading, refetch } = useQuery({
    queryKey: ['students-for-promotion', schoolId, selectedGrade, selectedSection],
    queryFn: async () => {
      let query = supabase
        .from('students')
        .select('id, full_name, admission_no, grade, section, status')
        .eq('school_id', schoolId!)
        .eq('grade', selectedGrade)
        .eq('status', 'active')
        .order('full_name');

      if (selectedSection !== 'all') {
        query = query.eq('section', selectedSection);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Student[];
    },
    enabled: !!schoolId && !!selectedGrade
  });

  const filteredStudents = studentsData?.filter(student =>
    student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.admission_no.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleSelectAll = () => {
    if (selectedStudents.size === filteredStudents.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(filteredStudents.map(s => s.id)));
    }
  };

  const handleSelectStudent = (studentId: string) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
  };

  const handlePromoteStudents = async () => {
    if (selectedStudents.size === 0) {
      toast.error('Please select at least one student to promote');
      return;
    }

    if (!targetGrade) {
      toast.error('Please select target grade');
      return;
    }

    if (fromYear === toYear) {
      toast.error('From and To academic years must be different');
      return;
    }

    setProcessing(true);
    setPromotionResult(null);

    try {
      const response = await fetch('/api/admin/students/promote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          school_id: schoolId,
          student_ids: Array.from(selectedStudents),
          from_academic_year: fromYear,
          to_academic_year: toYear,
          target_grade: targetGrade
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to promote students');
      }

      setPromotionResult(data);
      toast.success(`Successfully promoted ${data.promoted_count} student(s)!`);
      setSelectedStudents(new Set());
      refetch();
    } catch (error: any) {
      console.error('Promotion error:', error);
      toast.error(error.message || 'Failed to promote students');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TrendingUp className="h-8 w-8" />
            Student Promotions
          </h1>
          <p className="text-muted-foreground mt-1">
            Promote students to the next academic year and grade
          </p>
        </div>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Important Notes</AlertTitle>
        <AlertDescription>
          • This will update student grades for the selected academic year<br/>
          • Students' academic records and historical data will be preserved<br/>
          • After promotion, run "Carry Forward Dues" in Finance & Accounting to transfer unpaid fees
        </AlertDescription>
      </Alert>

      {/* Academic Year Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Academic Years</CardTitle>
          <CardDescription>Choose the source and target academic years</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="from_year">From Academic Year</Label>
              <Select value={fromYear} onValueChange={setFromYear}>
                <SelectTrigger id="from_year">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {academicYears.map(year => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="to_year">To Academic Year</Label>
              <Select value={toYear} onValueChange={setToYear}>
                <SelectTrigger id="to_year">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {academicYears.map(year => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grade and Section Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Students</CardTitle>
          <CardDescription>Filter by grade and section</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="current_grade">Current Grade</Label>
              <Select value={selectedGrade} onValueChange={(value) => {
                setSelectedGrade(value);
                setSelectedSection('all');
                setSelectedStudents(new Set());
              }}>
                <SelectTrigger id="current_grade">
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  {grades.map(grade => (
                    <SelectItem key={grade} value={grade}>
                      {grade === 'NURSERY' || grade === 'LKG' || grade === 'UKG' ? grade : `Class ${grade}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="section">Section</Label>
              <Select value={selectedSection} onValueChange={setSelectedSection}>
                <SelectTrigger id="section">
                  <SelectValue placeholder="All sections" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {sectionsData?.map(section => (
                    <SelectItem key={section.id} value={section.section}>
                      Section {section.section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="target_grade">Target Grade</Label>
              <Select value={targetGrade} onValueChange={setTargetGrade}>
                <SelectTrigger id="target_grade">
                  <SelectValue placeholder="Promote to..." />
                </SelectTrigger>
                <SelectContent>
                  {grades.map(grade => (
                    <SelectItem key={grade} value={grade}>
                      {grade === 'NURSERY' || grade === 'LKG' || grade === 'UKG' ? grade : `Class ${grade}`}
                    </SelectItem>
                  ))}
                  <SelectItem value="GRADUATED">Mark as Graduated</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Name or Admission No"
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students List */}
      {selectedGrade && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Students - {selectedGrade === 'NURSERY' || selectedGrade === 'LKG' || selectedGrade === 'UKG' ? selectedGrade : `Class ${selectedGrade}`}</CardTitle>
                <CardDescription>
                  {selectedStudents.size} of {filteredStudents.length} students selected
                </CardDescription>
              </div>
              <Button
                onClick={handlePromoteStudents}
                disabled={processing || selectedStudents.size === 0 || !targetGrade}
              >
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Promoting...
                  </>
                ) : (
                  <>
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Promote Selected ({selectedStudents.size})
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No students found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={selectedStudents.size === filteredStudents.length && filteredStudents.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Admission No</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Current Grade</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedStudents.has(student.id)}
                          onCheckedChange={() => handleSelectStudent(student.id)}
                        />
                      </TableCell>
                      <TableCell className="font-mono">{student.admission_no}</TableCell>
                      <TableCell className="font-medium">{student.full_name}</TableCell>
                      <TableCell>
                        {student.grade === 'NURSERY' || student.grade === 'LKG' || student.grade === 'UKG'
                          ? student.grade
                          : `Class ${student.grade}`}
                      </TableCell>
                      <TableCell>{student.section}</TableCell>
                      <TableCell>
                        <Badge variant="default">{student.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Promotion Result */}
      {promotionResult && (
        <Alert className="border-green-500 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Promotion Successful!</AlertTitle>
          <AlertDescription className="text-green-700">
            <strong>{promotionResult.promoted_count}</strong> student(s) have been promoted from{' '}
            <strong>{selectedGrade}</strong> to <strong>{targetGrade}</strong>.<br />
            <br />
            <strong>Next Steps:</strong><br />
            • Go to Finance & Accounting → Settings → Carry Forward Dues<br />
            • Select academic years: {fromYear} → {toYear}<br />
            • This will transfer any unpaid fees to the new academic year
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
