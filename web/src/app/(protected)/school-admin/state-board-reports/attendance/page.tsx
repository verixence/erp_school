'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Calendar,
  Users,
  Upload,
  Download,
  Edit,
  Save,
  X,
  Check,
  AlertCircle,
  FileSpreadsheet,
  Clock,
  TrendingUp,
  UserCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase-client';
import { 
  useMonthlyAttendance,
  useCreateMonthlyAttendance,
  useBulkCreateMonthlyAttendance,
  type MonthlyAttendance,
  type CreateMonthlyAttendanceData,
} from '@erp/common';

interface Student {
  id: string;
  full_name: string;
  admission_no?: string;
  grade: string;
  section: string;
}

interface AttendanceRecord extends CreateMonthlyAttendanceData {
  student_name: string;
  admission_no?: string;
  isEditing?: boolean;
  hasChanges?: boolean;
}

export default function MonthlyAttendancePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingRows, setEditingRows] = useState<Set<string>>(new Set());

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Fetch sections
  const { data: sections = [] } = useQuery({
    queryKey: ['school-sections', user?.school_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sections')
        .select('grade, section')
        .eq('school_id', user?.school_id!)
        .order('grade, section');
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.school_id,
  });

  // Get unique grades and sections
  const grades = [...new Set(sections.map(s => s.grade))].sort();
  const sectionsForGrade = sections.filter(s => s.grade === selectedGrade).map(s => s.section);

  // Fetch students for selected grade and section
  const { data: students = [] } = useQuery({
    queryKey: ['students', user?.school_id, selectedGrade, selectedSection],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, full_name, admission_no, grade, section')
        .eq('school_id', user?.school_id!)
        .eq('grade', selectedGrade)
        .eq('section', selectedSection)
        .order('full_name');
      
      if (error) throw error;
      return data as Student[];
    },
    enabled: !!user?.school_id && !!selectedGrade && !!selectedSection,
  });

  // Fetch existing attendance data
  const { data: existingAttendance = [] } = useQuery({
    queryKey: ['monthly-attendance-bulk', user?.school_id, selectedGrade, selectedSection, selectedMonth, selectedYear],
    queryFn: async () => {
      if (!students.length) return [];
      
      const studentIds = students.map(s => s.id);
      const { data, error } = await supabase
        .from('monthly_attendance')
        .select('*')
        .in('student_id', studentIds)
        .eq('month', selectedMonth)
        .eq('year', selectedYear);
      
      if (error) throw error;
      return data as MonthlyAttendance[];
    },
    enabled: students.length > 0,
  });

  // Bulk create/update attendance mutation
  const bulkCreateAttendanceMutation = useBulkCreateMonthlyAttendance();

  // Load attendance data when students or existing data changes
  useEffect(() => {
    if (students.length > 0) {
      const records: AttendanceRecord[] = students.map(student => {
        const existing = existingAttendance.find(att => att.student_id === student.id);
        return {
          student_id: student.id,
          student_name: student.full_name,
          admission_no: student.admission_no,
          month: selectedMonth,
          year: selectedYear,
          working_days: existing?.working_days || 0,
          present_days: existing?.present_days || 0,
          isEditing: false,
          hasChanges: false,
        };
      });
      setAttendanceRecords(records);
    } else {
      setAttendanceRecords([]);
    }
  }, [students, existingAttendance, selectedMonth, selectedYear]);

  // Handle cell edit
  const handleCellEdit = (studentId: string, field: 'working_days' | 'present_days', value: number) => {
    setAttendanceRecords(prev => prev.map(record => {
      if (record.student_id === studentId) {
        const updated = { ...record, [field]: value, hasChanges: true };
        // Ensure present_days doesn't exceed working_days
        if (field === 'working_days' && updated.present_days > value) {
          updated.present_days = value;
        }
        if (field === 'present_days' && value > updated.working_days) {
          return record; // Don't update if present > working
        }
        return updated;
      }
      return record;
    }));
  };

  // Toggle edit mode for a row
  const toggleEdit = (studentId: string) => {
    setEditingRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  };

  // Save all changes
  const handleSaveAll = async () => {
    try {
      setIsLoading(true);
      
      const changedRecords = attendanceRecords
        .filter(record => record.hasChanges)
        .map(record => ({
          student_id: record.student_id,
          month: record.month,
          year: record.year,
          working_days: record.working_days,
          present_days: record.present_days,
        }));

      if (changedRecords.length === 0) {
        toast.info('No changes to save');
        return;
      }

      await bulkCreateAttendanceMutation.mutateAsync(changedRecords);
      
      // Reset editing states
      setAttendanceRecords(prev => prev.map(record => ({
        ...record,
        hasChanges: false,
        isEditing: false,
      })));
      setEditingRows(new Set());
      
      toast.success(`Saved attendance for ${changedRecords.length} students`);
    } catch (error) {
      toast.error('Failed to save attendance data');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-fill working days for all students
  const handleAutoFillWorkingDays = (days: number) => {
    setAttendanceRecords(prev => prev.map(record => ({
      ...record,
      working_days: days,
      hasChanges: true,
      // Adjust present days if it exceeds working days
      present_days: record.present_days > days ? days : record.present_days,
    })));
  };

  // Calculate statistics
  const stats = {
    totalStudents: attendanceRecords.length,
    avgWorkingDays: attendanceRecords.length > 0 
      ? (attendanceRecords.reduce((sum, r) => sum + r.working_days, 0) / attendanceRecords.length).toFixed(1)
      : '0',
    avgPresentDays: attendanceRecords.length > 0 
      ? (attendanceRecords.reduce((sum, r) => sum + r.present_days, 0) / attendanceRecords.length).toFixed(1)
      : '0',
    avgAttendanceRate: attendanceRecords.length > 0
      ? (attendanceRecords.reduce((sum, r) => {
          const rate = r.working_days > 0 ? (r.present_days / r.working_days) * 100 : 0;
          return sum + rate;
        }, 0) / attendanceRecords.length).toFixed(1)
      : '0',
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="h-8 w-8 text-blue-600" />
            Monthly Attendance
          </h1>
          <p className="text-gray-600 mt-2">
            Manage monthly attendance data for State Board report cards
          </p>
        </div>
        <Badge className="bg-blue-100 text-blue-800 text-lg px-4 py-2">
          {monthNames[selectedMonth - 1]} {selectedYear}
        </Badge>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          {
            title: "Total Students",
            value: stats.totalStudents,
            description: "In selected section",
            icon: Users,
            color: "bg-blue-500",
          },
          {
            title: "Avg Working Days",
            value: stats.avgWorkingDays,
            description: "Days in month",
            icon: Calendar,
            color: "bg-green-500",
          },
          {
            title: "Avg Present Days",
            value: stats.avgPresentDays,
            description: "Days attended",
            icon: UserCheck,
            color: "bg-purple-500",
          },
          {
            title: "Avg Attendance Rate",
            value: `${stats.avgAttendanceRate}%`,
            description: "Overall percentage",
            icon: TrendingUp,
            color: "bg-emerald-500",
          },
        ].map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${stat.color}`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Filters</CardTitle>
          <CardDescription>
            Select class, section, and month to manage attendance data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="grade">Grade</Label>
              <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose grade" />
                </SelectTrigger>
                <SelectContent>
                  {grades.map((grade) => (
                    <SelectItem key={grade} value={grade.toString()}>
                      Grade {grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="section">Section</Label>
              <Select value={selectedSection} onValueChange={setSelectedSection}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose section" />
                </SelectTrigger>
                <SelectContent>
                  {sectionsForGrade.map((section) => (
                    <SelectItem key={section} value={section}>
                      Section {section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="month">Month</Label>
              <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthNames.map((month, index) => (
                    <SelectItem key={index} value={(index + 1).toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="year">Year</Label>
              <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2023, 2024, 2025, 2026].map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                onClick={handleSaveAll}
                disabled={!attendanceRecords.some(r => r.hasChanges) || isLoading}
                className="w-full"
              >
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? 'Saving...' : 'Save All'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Data */}
      {selectedGrade && selectedSection && attendanceRecords.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  Grade {selectedGrade} Section {selectedSection} - {monthNames[selectedMonth - 1]} {selectedYear}
                </CardTitle>
                <CardDescription>
                  Enter working days and present days for each student
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <Label>Auto-fill working days:</Label>
                  {[20, 22, 24, 26].map(days => (
                    <Button
                      key={days}
                      size="sm"
                      variant="outline"
                      onClick={() => handleAutoFillWorkingDays(days)}
                    >
                      {days}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">S.No</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Admission No</TableHead>
                    <TableHead className="text-center">Working Days</TableHead>
                    <TableHead className="text-center">Present Days</TableHead>
                    <TableHead className="text-center">Attendance %</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceRecords.map((record, index) => {
                    const isEditing = editingRows.has(record.student_id);
                    const attendancePercentage = record.working_days > 0 
                      ? ((record.present_days / record.working_days) * 100).toFixed(1)
                      : '0';
                    const attendanceColor = parseFloat(attendancePercentage) >= 75 
                      ? 'text-green-600' 
                      : parseFloat(attendancePercentage) >= 50 
                      ? 'text-yellow-600' 
                      : 'text-red-600';

                    return (
                      <TableRow key={record.student_id} className={record.hasChanges ? 'bg-yellow-50' : ''}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{record.student_name}</div>
                          </div>
                        </TableCell>
                        <TableCell>{record.admission_no || 'N/A'}</TableCell>
                        <TableCell className="text-center">
                          {isEditing ? (
                            <Input
                              type="number"
                              min="0"
                              max="31"
                              value={record.working_days}
                              onChange={(e) => handleCellEdit(record.student_id, 'working_days', parseInt(e.target.value) || 0)}
                              className="w-20 text-center"
                            />
                          ) : (
                            <span className="font-medium">{record.working_days}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {isEditing ? (
                            <Input
                              type="number"
                              min="0"
                              max={record.working_days}
                              value={record.present_days}
                              onChange={(e) => handleCellEdit(record.student_id, 'present_days', parseInt(e.target.value) || 0)}
                              className="w-20 text-center"
                            />
                          ) : (
                            <span className="font-medium">{record.present_days}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`font-medium ${attendanceColor}`}>
                            {attendancePercentage}%
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {record.hasChanges ? (
                            <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                              <Clock className="w-3 h-3 mr-1" />
                              Changed
                            </Badge>
                          ) : record.working_days > 0 ? (
                            <Badge variant="outline" className="bg-green-100 text-green-800">
                              <Check className="w-3 h-3 mr-1" />
                              Saved
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-gray-100 text-gray-800">
                              Empty
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleEdit(record.student_id)}
                          >
                            {isEditing ? (
                              <X className="h-3 w-3" />
                            ) : (
                              <Edit className="h-3 w-3" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {attendanceRecords.some(r => r.hasChanges) && (
              <Alert className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You have unsaved changes. Click "Save All" to persist your changes.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* No Data State */}
      {selectedGrade && selectedSection && attendanceRecords.length === 0 && (
        <Card className="p-8 text-center">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No students found</h3>
          <p className="text-gray-500">
            No students found in Grade {selectedGrade} Section {selectedSection}
          </p>
        </Card>
      )}

      {/* Instructions */}
      {!selectedGrade || !selectedSection ? (
        <Card className="p-8 text-center">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select Grade and Section</h3>
          <p className="text-gray-500">
            Choose a grade and section to start managing monthly attendance data
          </p>
        </Card>
      ) : null}
    </div>
  );
} 