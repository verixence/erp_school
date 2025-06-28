'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/hooks/use-auth';
import { 
  Calendar, 
  Users, 
  Save, 
  ArrowLeft,
  Check,
  X,
  Clock,
  FileX
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';

interface Section {
  id: string;
  grade: string;
  section: string;
  subject: string;
}

interface Student {
  id: string;
  full_name: string;
  admission_no: string;
  grade: string;
  section: string;
}

interface AttendanceRecord {
  student_id: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
}

export default function TeacherAttendancePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [attendanceData, setAttendanceData] = useState<Record<string, AttendanceRecord>>({});

  // Fetch sections where this teacher is assigned
  const { data: sections } = useQuery({
    queryKey: ['teacher-sections', user?.id],
    queryFn: async (): Promise<Section[]> => {
      if (!user?.id) throw new Error('No user ID');

      // Get sections via section_teachers junction table
      const { data, error } = await supabase
        .from('section_teachers')
        .select(`
          sections!inner(
            id,
            grade,
            section,
            school_id
          )
        `)
        .eq('teacher_id', user.id)
        .eq('sections.school_id', user.school_id);

      if (error) throw error;
      
      // Transform the data to match the expected Section interface
      const sectionsData = data?.map((item: any) => ({
        id: item.sections.id,
        grade: item.sections.grade,
        section: item.sections.section,
        subject: 'All Subjects' // Teachers can mark attendance for all subjects in their sections
      })) || [];

      return sectionsData;
    },
    enabled: !!user?.id,
  });

  // Fetch students for selected section
  const { data: students } = useQuery({
    queryKey: ['section-students', selectedSection],
    queryFn: async (): Promise<Student[]> => {
      if (!selectedSection) return [];

      const { data: sectionData } = await supabase
        .from('sections')
        .select('grade, section')
        .eq('id', selectedSection)
        .single();

      if (!sectionData) return [];

      const { data, error } = await supabase
        .from('students')
        .select('id, full_name, admission_no, grade, section')
        .eq('school_id', user?.school_id)
        .eq('grade', sectionData.grade)
        .eq('section', sectionData.section)
        .order('full_name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedSection && !!user?.school_id,
  });

  // Fetch existing attendance for selected date and section
  const { data: existingAttendance } = useQuery({
    queryKey: ['attendance', selectedSection, selectedDate],
    queryFn: async () => {
      if (!selectedSection || !selectedDate || !students?.length) return [];

      const studentIds = students.map(s => s.id);

      const { data, error } = await supabase
        .from('attendance_records')
        .select('student_id, status, notes')
        .eq('school_id', user?.school_id)
        .eq('date', selectedDate)
        .in('student_id', studentIds);

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedSection && !!selectedDate && !!students?.length,
  });

  // Initialize attendance data when existing records are loaded
  React.useEffect(() => {
    if (existingAttendance && students) {
      const attendanceMap: Record<string, AttendanceRecord> = {};
      
      // Initialize all students as present by default
      students.forEach(student => {
        attendanceMap[student.id] = {
          student_id: student.id,
          status: 'present',
          notes: ''
        };
      });

      // Override with existing records
      existingAttendance.forEach(record => {
        attendanceMap[record.student_id] = {
          student_id: record.student_id,
          status: record.status as any,
          notes: record.notes || ''
        };
      });

      setAttendanceData(attendanceMap);
    }
  }, [existingAttendance, students]);

  // Save attendance mutation
  const saveAttendanceMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSection || !selectedDate || !user?.school_id) {
        throw new Error('Missing required data');
      }

      const records = Object.values(attendanceData).map(record => ({
        school_id: user.school_id,
        student_id: record.student_id,
        date: selectedDate,
        status: record.status,
        recorded_by: user.id,
        notes: record.notes || null
      }));

      // Use upsert to handle existing records
      const { error } = await supabase
        .from('attendance_records')
        .upsert(records, {
          onConflict: 'student_id,date',
          ignoreDuplicates: false
        });

      if (error) throw error;
    },
         onSuccess: () => {
       toast.success('Attendance saved successfully');
       queryClient.invalidateQueries({ queryKey: ['attendance'] });
     },
     onError: (error) => {
       toast.error('Failed to save attendance: ' + error.message);
     },
  });

  const updateAttendance = (studentId: string, status: AttendanceRecord['status'], notes?: string) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: {
        student_id: studentId,
        status,
        notes: notes || prev[studentId]?.notes || ''
      }
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800 border-green-200';
      case 'absent': return 'bg-red-100 text-red-800 border-red-200';
      case 'late': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'excused': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <Check className="w-4 h-4" />;
      case 'absent': return <X className="w-4 h-4" />;
      case 'late': return <Clock className="w-4 h-4" />;
      case 'excused': return <FileX className="w-4 h-4" />;
      default: return null;
    }
  };

  const getAttendanceSummary = () => {
    const records = Object.values(attendanceData);
    const total = records.length;
    const present = records.filter(r => r.status === 'present').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const late = records.filter(r => r.status === 'late').length;
    const excused = records.filter(r => r.status === 'excused').length;

    return { total, present, absent, late, excused };
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link
                href="/teacher"
                className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Dashboard
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Attendance Marking</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Controls */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Mark Attendance</CardTitle>
            <CardDescription>
              Select a section and date to mark student attendance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="section">Section</Label>
                <Select value={selectedSection} onValueChange={setSelectedSection}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a section" />
                  </SelectTrigger>
                  <SelectContent>
                    {sections?.map((section) => (
                      <SelectItem key={section.id} value={section.id}>
                        {section.grade} {section.section} - {section.subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="flex items-end">
                                 <Button
                   onClick={() => saveAttendanceMutation.mutate()}
                   disabled={!selectedSection || !(students?.length) || saveAttendanceMutation.isPending}
                   className="w-full"
                 >
                  <Save className="w-4 h-4 mr-2" />
                  {saveAttendanceMutation.isPending ? 'Saving...' : 'Save Attendance'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

                 {/* Summary Cards */}
         {selectedSection && students && students.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            {Object.entries(getAttendanceSummary()).map(([key, value]) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card>
                  <CardContent className="p-6">
                    <div className="text-2xl font-bold">{value}</div>
                    <p className="text-xs text-muted-foreground capitalize">
                      {key}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

                 {/* Student List */}
         {selectedSection && students && students.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Students</CardTitle>
              <CardDescription>
                Mark attendance for each student
              </CardDescription>
            </CardHeader>
            <CardContent>
                             <div className="space-y-4">
                 {students?.map((student, index) => (
                  <motion.div
                    key={student.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium">{student.full_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {student.admission_no} • {student.grade} {student.section}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {(['present', 'absent', 'late', 'excused'] as const).map((status) => (
                        <Button
                          key={status}
                          variant={attendanceData[student.id]?.status === status ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => updateAttendance(student.id, status)}
                          className={attendanceData[student.id]?.status === status ? getStatusColor(status) : ''}
                        >
                          {getStatusIcon(status)}
                          <span className="ml-1 capitalize">{status}</span>
                        </Button>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : selectedSection ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Students Found</h3>
                <p className="text-sm text-muted-foreground">
                  No students are enrolled in the selected section.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Select a Section</h3>
                <p className="text-sm text-muted-foreground">
                  Choose a section from the dropdown above to start marking attendance.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 