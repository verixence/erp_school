'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Download, Eye, Calendar, TrendingUp, Award, User, GraduationCap } from 'lucide-react';
import { generateStateBoardReportPDF } from '@/lib/state-board-report-engine';
import { toast } from 'sonner';

interface Child {
  id: string;
  full_name: string;
  admission_no: string;
  grade: string;
  section: string;
}

interface StateBoardReport {
  id: string;
  report_type: string;
  assessment_number: number;
  academic_year: string;
  total_marks: number;
  obtained_marks: number;
  percentage: number;
  overall_grade?: string;
  overall_remark?: string;
  subject_marks: any[];
  attendance_data: Record<string, any>;
  status: string;
  is_published: boolean;
  generated_at: string;
  exam_group?: {
    name: string;
    start_date: string;
    end_date: string;
  };
}

export default function ParentReportsPage() {
  const { user } = useAuth();
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [reportTypeFilter, setReportTypeFilter] = useState<string>('all');

  // Fetch parent's children
  const { data: children = [] } = useQuery({
    queryKey: ['parent-children', user?.id],
    queryFn: async (): Promise<Child[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('student_parents')
        .select(`
          student_id,
          students!inner(
            id,
            full_name,
            admission_no,
            grade,
            section
          )
        `)
        .eq('parent_id', user.id);

      if (error) throw error;

      return (data || []).map((item: any) => ({
        id: item.students.id,
        full_name: item.students.full_name,
        admission_no: item.students.admission_no,
        grade: item.students.grade,
        section: item.students.section,
      }));
    },
    enabled: !!user?.id,
  });

  // Set default child
  useMemo(() => {
    if (children && children.length > 0 && !selectedChild) {
      setSelectedChild(children[0].id);
    }
  }, [children, selectedChild]);

  // Fetch State Board reports for selected child
  const { data: stateBoardReports = [], isLoading: reportsLoading } = useQuery({
    queryKey: ['state-board-reports', selectedChild],
    queryFn: async (): Promise<StateBoardReport[]> => {
      if (!selectedChild) return [];

      const { data, error } = await supabase
        .from('state_board_reports')
        .select(`
          *,
          exam_group:exam_groups(name, start_date, end_date)
        `)
        .eq('student_id', selectedChild)
        .eq('is_published', true)
        .order('generated_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedChild,
  });

  // Fetch school info for report generation
  const { data: school } = useQuery({
    queryKey: ['school', user?.school_id],
    queryFn: async () => {
      if (!user?.school_id) return null;

      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .eq('id', user.school_id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.school_id,
  });

  const filteredReports = useMemo(() => {
    if (reportTypeFilter === 'all') return stateBoardReports;
    return stateBoardReports.filter(r => r.report_type === reportTypeFilter);
  }, [stateBoardReports, reportTypeFilter]);

  const handleViewReport = async (report: StateBoardReport) => {
    if (!school) {
      toast.error('School information not found');
      return;
    }

    try {
      const child = children.find(c => c.id === selectedChild);
      if (!child) return;

      // Extract parent name from student_parents relationship
      const { data: studentData } = await supabase
        .from('students')
        .select(`
          student_parents(
            parent:users!student_parents_parent_id_fkey(
              first_name,
              last_name
            )
          )
        `)
        .eq('id', selectedChild)
        .single();

      const parentData = studentData?.student_parents?.[0]?.parent;
      const parentName = parentData && !Array.isArray(parentData)
        ? `${(parentData as any).first_name} ${(parentData as any).last_name}`
        : '';

      const reportData = {
        student: {
          id: selectedChild,
          full_name: child.full_name,
          admission_no: child.admission_no,
          section: child.section,
          grade: child.grade,
          father_name: parentName,
          mother_name: '',
        },
        school: {
          name: school.name,
          address: school.address || '',
          logo_url: school.logo_url,
        },
        exam: {
          name: report.exam_group?.name || `${report.report_type}-${report.assessment_number}`,
          type: (report.report_type === 'FA' || report.report_type === 'SA') ? report.report_type as 'FA' | 'SA' : 'FA' as 'FA' | 'SA',
          assessment_number: report.assessment_number || 1,
          academic_year: report.academic_year,
          date_range: report.exam_group ? `${report.exam_group.start_date} to ${report.exam_group.end_date}` : '',
        },
        subject_marks: report.subject_marks,
        total_marks: report.total_marks,
        obtained_marks: report.obtained_marks,
        percentage: report.percentage,
        overall_grade: report.overall_grade,
        overall_remark: report.overall_remark,
        attendance: report.attendance_data,
        grading_legend: report.report_type === 'FA'
          ? [
              { min: 19, max: 20, grade: "O", remark: "Outstanding" },
              { min: 15, max: 18, grade: "A", remark: "Excellent Progress" },
              { min: 11, max: 14, grade: "B", remark: "Good" },
              { min: 6, max: 10, grade: "C", remark: "Pass" },
              { min: 0, max: 5, grade: "D", remark: "Needs Improvement" }
            ]
          : [
              { min: 540, max: 600, grade: "O", remark: "Outstanding" },
              { min: 432, max: 539, grade: "A", remark: "Excellent" },
              { min: 312, max: 431, grade: "B", remark: "Good" },
              { min: 205, max: 311, grade: "C", remark: "Pass" },
              { min: 0, max: 204, grade: "D", remark: "Need to Improve" }
            ],
      };

      await generateStateBoardReportPDF(reportData);
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    }
  };

  if (reportsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            Report Cards
          </h1>
          <p className="text-muted-foreground mt-1">
            View your child's academic progress reports
          </p>
        </div>
      </div>

      {/* Child Selector */}
      {children.length > 1 && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <User className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Select Child</label>
                <Select value={selectedChild} onValueChange={setSelectedChild}>
                  <SelectTrigger className="w-full max-w-md">
                    <SelectValue placeholder="Choose a child" />
                  </SelectTrigger>
                  <SelectContent>
                    {children.map((child) => (
                      <SelectItem key={child.id} value={child.id}>
                        {child.full_name} - Grade {child.grade}-{child.section}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Overview */}
      {selectedChild && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stateBoardReports.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                FA Reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stateBoardReports.filter(r => r.report_type === 'FA').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                SA Reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stateBoardReports.filter(r => r.report_type === 'SA').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Latest Grade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {stateBoardReports[0]?.overall_grade || 'N/A'}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Report Type Filter */}
      <Tabs value={reportTypeFilter} onValueChange={setReportTypeFilter} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">All Reports</TabsTrigger>
          <TabsTrigger value="FA">FA (Formative)</TabsTrigger>
          <TabsTrigger value="SA">SA (Summative)</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Reports List */}
      {filteredReports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Reports Available</h3>
            <p className="text-muted-foreground text-center max-w-md">
              {selectedChild
                ? 'No published reports found for this child. Reports will appear here once they are generated and published by the school.'
                : 'Please select a child to view their reports.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredReports.map((report) => (
            <Card key={report.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg ${
                      report.report_type === 'FA' ? 'bg-blue-100' : 'bg-purple-100'
                    }`}>
                      <GraduationCap className={`h-6 w-6 ${
                        report.report_type === 'FA' ? 'text-blue-600' : 'text-purple-600'
                      }`} />
                    </div>
                    <div>
                      <CardTitle className="text-xl">
                        {report.report_type}-{report.assessment_number} Report
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Calendar className="h-4 w-4" />
                        {report.academic_year}
                        {report.exam_group && (
                          <span className="text-xs">• {report.exam_group.name}</span>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant={report.is_published ? 'default' : 'secondary'}>
                    {report.is_published ? 'Published' : 'Draft'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Total Marks</p>
                    <p className="text-2xl font-bold">{report.total_marks}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Obtained</p>
                    <p className="text-2xl font-bold">{report.obtained_marks}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Percentage</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {report.percentage.toFixed(1)}%
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Grade</p>
                    <p className="text-2xl font-bold text-green-600">
                      {report.overall_grade || 'N/A'}
                    </p>
                  </div>
                </div>

                {report.overall_remark && (
                  <div className="bg-muted p-3 rounded-lg mb-4">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Remark:
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {report.overall_remark}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Generated on {new Date(report.generated_at).toLocaleDateString()}
                  </div>
                  <Button onClick={() => handleViewReport(report)} className="gap-2">
                    <Eye className="h-4 w-4" />
                    View Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
