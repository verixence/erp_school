'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/hooks/use-auth';
import { 
  Calendar, 
  Users, 
  ArrowLeft,
  Download,
  Check,
  X,
  Clock,
  FileX,
  Filter,
  BarChart3
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

interface AttendancePivotData {
  student_id: string;
  student_name: string;
  admission_no: string;
  grade: string;
  section: string;
  attendance_data: Record<string, {
    status: string;
    recorded_by: string;
    notes: string;
  }>;
}

interface AttendanceStats {
  total_students: number;
  total_records: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  excused_count: number;
  attendance_rate: number;
}

export default function SchoolAdminAttendancePage() {
  const { user } = useAuth();
  
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [sectionFilter, setSectionFilter] = useState<string>('all');

  // Fetch attendance pivot data
  const { data: attendanceData, isLoading } = useQuery({
    queryKey: ['attendance-pivot', user?.school_id, startDate, endDate],
    queryFn: async (): Promise<AttendancePivotData[]> => {
      if (!user?.school_id) throw new Error('No school ID');

      const { data, error } = await supabase
        .rpc('attendance_pivot', {
          start_date: startDate,
          end_date: endDate,
          school_id_param: user.school_id
        });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.school_id,
  });

  // Fetch attendance statistics
  const { data: stats } = useQuery({
    queryKey: ['attendance-stats', user?.school_id, startDate, endDate],
    queryFn: async (): Promise<AttendanceStats> => {
      if (!user?.school_id) throw new Error('No school ID');

      const { data, error } = await supabase
        .rpc('get_attendance_stats', {
          start_date: startDate,
          end_date: endDate,
          school_id_param: user.school_id
        });

      if (error) throw error;
      return data?.[0] || {
        total_students: 0,
        total_records: 0,
        present_count: 0,
        absent_count: 0,
        late_count: 0,
        excused_count: 0,
        attendance_rate: 0
      };
    },
    enabled: !!user?.school_id,
  });

  // Get unique grades and sections for filtering
  const grades = [...new Set(attendanceData?.map(d => d.grade) || [])].sort();
  const sections = [...new Set(attendanceData?.map(d => d.section) || [])].sort();

  // Filter attendance data
  const filteredData = attendanceData?.filter(student => {
    if (gradeFilter !== 'all' && student.grade !== gradeFilter) return false;
    if (sectionFilter !== 'all' && student.section !== sectionFilter) return false;
    return true;
  }) || [];

  // Get date range for columns
  const getDateRange = () => {
    const dates = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d).toISOString().split('T')[0]);
    }
    return dates;
  };

  const dateRange = getDateRange();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <Check className="w-3 h-3 text-green-600" />;
      case 'absent': return <X className="w-3 h-3 text-red-600" />;
      case 'late': return <Clock className="w-3 h-3 text-yellow-600" />;
      case 'excused': return <FileX className="w-3 h-3 text-blue-600" />;
      default: return <div className="w-3 h-3 rounded-full bg-gray-300" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-100 hover:bg-green-200';
      case 'absent': return 'bg-red-100 hover:bg-red-200';
      case 'late': return 'bg-yellow-100 hover:bg-yellow-200';
      case 'excused': return 'bg-blue-100 hover:bg-blue-200';
      default: return 'bg-gray-50 hover:bg-gray-100';
    }
  };

  const exportToCSV = () => {
    if (!filteredData.length) return;

    const headers = ['Student Name', 'Admission No', 'Grade', 'Section', ...dateRange];
    const rows = filteredData.map(student => [
      student.student_name,
      student.admission_no,
      student.grade,
      student.section,
      ...dateRange.map(date => student.attendance_data[date]?.status || '-')
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${startDate}-to-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link
                href="/school-admin"
                className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Dashboard
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <BarChart3 className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Attendance Master Grid</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Controls */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Attendance Overview</CardTitle>
            <CardDescription>
              View and analyze attendance data across date ranges
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="grade">Grade</Label>
                <Select value={gradeFilter} onValueChange={setGradeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Grades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Grades</SelectItem>
                    {grades.map((grade) => (
                      <SelectItem key={grade} value={grade}>
                        {grade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="section">Section</Label>
                <Select value={sectionFilter} onValueChange={setSectionFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Sections" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sections</SelectItem>
                    {sections.map((section) => (
                      <SelectItem key={section} value={section}>
                        {section}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  onClick={exportToCSV}
                  disabled={!filteredData.length}
                  variant="outline"
                  className="w-full"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>

              <div className="flex items-end">
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                  className="w-full"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="text-2xl font-bold">{stats.total_students}</div>
                  <p className="text-xs text-muted-foreground">Total Students</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="text-2xl font-bold text-green-600">{stats.present_count}</div>
                  <p className="text-xs text-muted-foreground">Present</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="text-2xl font-bold text-red-600">{stats.absent_count}</div>
                  <p className="text-xs text-muted-foreground">Absent</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="text-2xl font-bold text-yellow-600">{stats.late_count}</div>
                  <p className="text-xs text-muted-foreground">Late</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="text-2xl font-bold text-blue-600">{stats.excused_count}</div>
                  <p className="text-xs text-muted-foreground">Excused</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="text-2xl font-bold text-primary">{stats.attendance_rate}%</div>
                  <p className="text-xs text-muted-foreground">Attendance Rate</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}

        {/* Attendance Grid */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Grid</CardTitle>
            <CardDescription>
              Daily attendance matrix for all students
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-muted-foreground mt-4">Loading attendance data...</p>
              </div>
            ) : filteredData.length > 0 ? (
              <div className="overflow-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted">
                    <tr>
                      <th className="sticky left-0 bg-muted px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Student
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Grade/Section
                      </th>
                      {dateRange.map((date) => (
                        <th key={date} className="px-2 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          {new Date(date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-background divide-y divide-border">
                    {filteredData.map((student, index) => (
                      <motion.tr
                        key={student.student_id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className="hover:bg-muted/50"
                      >
                        <td className="sticky left-0 bg-background px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-foreground">
                              {student.student_name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {student.admission_no}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant="outline">
                            {student.grade} {student.section}
                          </Badge>
                        </td>
                        {dateRange.map((date) => {
                          const attendance = student.attendance_data[date];
                          return (
                            <td key={date} className="px-2 py-4 text-center">
                              {attendance ? (
                                <div
                                  className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${getStatusColor(attendance.status)} transition-colors`}
                                  title={`${attendance.status}${attendance.notes ? ': ' + attendance.notes : ''}`}
                                >
                                  {getStatusIcon(attendance.status)}
                                </div>
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gray-100 mx-auto" />
                              )}
                            </td>
                          );
                        })}
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Attendance Data</h3>
                <p className="text-sm text-muted-foreground">
                  No attendance records found for the selected date range and filters.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 