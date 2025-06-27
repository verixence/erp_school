'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  BarChart3,
  Users,
  BookOpen,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Activity,
  RefreshCw
} from 'lucide-react';

interface TeacherLoad {
  teacher_id: string;
  teacher_name: string;
  total_periods: number;
  max_periods: number;
  load_percentage: number;
  subjects_taught: string[];
  status: 'unassigned' | 'underutilized' | 'optimal' | 'overloaded';
}

interface Conflict {
  conflict_type: string;
  conflict_description: string;
  severity: 'info' | 'warning' | 'error';
  affected_periods: any;
}

export default function TeacherAnalytics() {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');

  // Fetch grades and subjects for filtering
  const { data: grades = [] } = useQuery({
    queryKey: ['grades', user?.school_id],
    queryFn: async () => {
      if (!user?.school_id) return [];
      
      const { data, error } = await supabase
        .from('sections')
        .select('grade')
        .eq('school_id', user.school_id);
      
      if (error) throw error;
      return [...new Set(data.map(s => s.grade))].sort((a, b) => a - b);
    },
    enabled: !!user?.school_id,
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects', user?.school_id],
    queryFn: async () => {
      if (!user?.school_id) return [];
      
      // First get sections for this school
      const { data: sectionData, error: sectionError } = await supabase
        .from('sections')
        .select('id')
        .eq('school_id', user.school_id);
      
      if (sectionError) throw sectionError;
      
      const sectionIds = sectionData.map(s => s.id);
      
      if (sectionIds.length === 0) return [];
      
      // Then get subjects from periods for these sections
      const { data, error } = await supabase
        .from('periods')
        .select('subject')
        .in('section_id', sectionIds);
      
      if (error) throw error;
      return [...new Set(data.map(p => p.subject).filter(Boolean))].sort();
    },
    enabled: !!user?.school_id,
  });

  // Fetch teacher load analysis
  const { data: teacherLoads = [], isLoading: loadsLoading, refetch: refetchLoads } = useQuery({
    queryKey: ['teacher-load-analysis', user?.school_id, selectedGrade, selectedSubject],
    queryFn: async () => {
      if (!user?.school_id) return [];
      
      const { data, error } = await supabase.rpc('get_teacher_load_analysis', {
        p_school_id: user.school_id
      });
      
      if (error) {
        console.error('Teacher load analysis error:', error);
        return [];
      }
      
      let filteredData = data as TeacherLoad[];
      
      // Apply grade filter
      if (selectedGrade !== 'all') {
        // This would need a more complex query in practice
        // For now, we'll filter on the frontend
        filteredData = filteredData.filter(teacher => {
          // TODO: Add grade-specific filtering logic
          return true;
        });
      }
      
      // Apply subject filter
      if (selectedSubject !== 'all') {
        filteredData = filteredData.filter(teacher => 
          teacher.subjects_taught.includes(selectedSubject)
        );
      }
      
      return filteredData;
    },
    enabled: !!user?.school_id,
  });

  // Fetch timetable conflicts
  const { data: conflicts = [], isLoading: conflictsLoading, refetch: refetchConflicts } = useQuery({
    queryKey: ['timetable-conflicts', user?.school_id],
    queryFn: async () => {
      if (!user?.school_id) return [];
      
      const { data, error } = await supabase.rpc('detect_timetable_conflicts', {
        p_school_id: user.school_id
      });
      
      if (error) {
        console.error('Conflict detection error:', error);
        return [];
      }
      return data as Conflict[];
    },
    enabled: !!user?.school_id,
  });

  const handleRefreshAnalytics = async () => {
    setRefreshing(true);
    await Promise.all([refetchLoads(), refetchConflicts()]);
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'unassigned': return 'bg-gray-100 text-gray-800';
      case 'underutilized': return 'bg-blue-100 text-blue-800';
      case 'optimal': return 'bg-green-100 text-green-800';
      case 'overloaded': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'info': return 'bg-blue-100 text-blue-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'info': return <Activity className="w-4 h-4" />;
      case 'warning': return <AlertTriangle className="w-4 h-4" />;
      case 'error': return <AlertTriangle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  // Calculate summary statistics
  const totalTeachers = teacherLoads.length;
  const overloadedTeachers = teacherLoads.filter(t => t.status === 'overloaded').length;
  const unassignedTeachers = teacherLoads.filter(t => t.status === 'unassigned').length;
  const averageLoad = totalTeachers > 0 
    ? (teacherLoads.reduce((sum, t) => sum + t.load_percentage, 0) / totalTeachers).toFixed(1)
    : '0';

  const criticalConflicts = conflicts.filter(c => c.severity === 'error').length;
  const warningConflicts = conflicts.filter(c => c.severity === 'warning').length;

  if (loadsLoading || conflictsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            Teacher Load Analytics
          </h2>
          <p className="text-gray-600">Monitor teacher workload and resolve scheduling conflicts</p>
        </div>
        
        <Button
          onClick={handleRefreshAnalytics}
          disabled={refreshing}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh Analytics'}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="grade-filter" className="text-sm font-medium text-gray-700">
                Filter by Grade:
              </label>
              <select
                id="grade-filter"
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Grades</option>
                {grades.map((grade) => (
                  <option key={grade} value={grade}>Grade {grade}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <label htmlFor="subject-filter" className="text-sm font-medium text-gray-700">
                Filter by Subject:
              </label>
              <select
                id="subject-filter"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Subjects</option>
                {subjects.map((subject) => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </div>
            
            {(selectedGrade !== 'all' || selectedSubject !== 'all') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedGrade('all');
                  setSelectedSubject('all');
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Total Teachers</h3>
                <div className="text-2xl font-bold text-gray-900">{totalTeachers}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Average Load</h3>
                <div className="text-2xl font-bold text-gray-900">{averageLoad}%</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Overloaded</h3>
                <div className="text-2xl font-bold text-gray-900">{overloadedTeachers}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Conflicts</h3>
                <div className="text-2xl font-bold text-gray-900">{criticalConflicts + warningConflicts}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conflicts Section */}
      {conflicts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Scheduling Conflicts ({conflicts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {conflicts.map((conflict, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 bg-gray-50"
                >
                  <div className={`p-1 rounded ${getSeverityColor(conflict.severity)}`}>
                    {getSeverityIcon(conflict.severity)}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {conflict.conflict_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {conflict.conflict_description}
                    </div>
                  </div>
                  <Badge className={getSeverityColor(conflict.severity)}>
                    {conflict.severity}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Teacher Load Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Teacher Workload Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          {teacherLoads.length > 0 ? (
            <div className="space-y-4">
              {teacherLoads.map((teacher) => (
                <div
                  key={teacher.teacher_id}
                  className="flex items-center justify-between p-4 rounded-lg border border-gray-200"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="font-medium text-gray-900">{teacher.teacher_name}</div>
                      <Badge className={getStatusColor(teacher.status)}>
                        {teacher.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    
                    <div className="mt-2 text-sm text-gray-600">
                      <div className="flex items-center gap-4">
                        <span>
                          <Clock className="w-4 h-4 inline mr-1" />
                          {teacher.total_periods} / {teacher.max_periods} periods
                        </span>
                        <span>
                          <BookOpen className="w-4 h-4 inline mr-1" />
                          {teacher.subjects_taught.length} subjects
                        </span>
                      </div>
                      
                      {teacher.subjects_taught.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {teacher.subjects_taught.map((subject, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {subject}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-lg font-semibold text-gray-900">
                      {teacher.load_percentage}%
                    </div>
                    <div className="w-24 h-2 bg-gray-200 rounded-full mt-1">
                      <div 
                        className={`h-2 rounded-full ${
                          teacher.load_percentage > 100 ? 'bg-red-500' :
                          teacher.load_percentage >= 80 ? 'bg-green-500' :
                          teacher.load_percentage >= 40 ? 'bg-yellow-500' :
                          'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(teacher.load_percentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No teacher data found</h3>
              <p className="text-gray-600">Assign teachers to periods to see workload analytics</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 