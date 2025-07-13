'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Download, 
  Eye, 
  Users, 
  Calendar,
  BookOpen,
  ArrowRight,
  CheckCircle,
  Clock,
  AlertCircle,
  Settings,
  Send,
  Filter,
  Search,
  Plus,
  Printer,
  Mail
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase-client';

interface ExamGroup {
  id: string;
  name: string;
  description?: string;
  exam_type: string;
  start_date: string;
  end_date: string;
  is_published: boolean;
  created_at: string;
}

interface BoardTemplate {
  id: string;
  name: string;
  board_type: string;
  description?: string;
  is_default: boolean;
  is_active: boolean;
  usage_count: number;
  template_html?: string;
  template_css?: string;
}

interface GeneratedReport {
  id: string;
  student_id: string;
  exam_group_id: string;
  template_id: string;
  status: 'draft' | 'generated' | 'published' | 'distributed';
  published: boolean;
  published_at?: string;
  generated_at?: string;
  pdf_url?: string;
  student?: {
    id: string;
    full_name: string;
    admission_no?: string;
    section?: string;
    grade?: string;
  };
  template?: {
    name: string;
    board_type: string;
  };
  report_data?: any; // Added for preview/download
}

interface School {
  id: string;
  name: string;
  board_affiliation?: string;
  logo_url?: string;
}

export default function ReportsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [selectedExamGroup, setSelectedExamGroup] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'generate' | 'manage'>('generate');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch school details with board affiliation
  const { data: school } = useQuery({
    queryKey: ['school-details', user?.school_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schools')
        .select('id, name, board_affiliation, logo_url')
        .eq('id', user?.school_id!)
        .single();
      
      if (error) throw error;
      return data as School;
    },
    enabled: !!user?.school_id,
  });

  // Fetch exam groups
  const { data: examGroups = [] } = useQuery({
    queryKey: ['exam-groups', user?.school_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exam_groups')
        .select('*')
        .eq('school_id', user?.school_id!)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ExamGroup[];
    },
    enabled: !!user?.school_id,
  });

  // Fetch available board templates
  const { data: templates = [] } = useQuery({
    queryKey: ['board-templates', school?.board_affiliation],
    queryFn: async () => {
      let query = supabase
        .from('board_report_templates')
        .select('id, name, board_type, description, is_default, is_active, usage_count, template_html, template_css')
        .eq('is_active', true);
      
      // Filter by school's board affiliation if available
      if (school?.board_affiliation) {
        query = query.eq('board_type', school.board_affiliation);
      }
      
      const { data, error } = await query.order('is_default', { ascending: false });
      
      if (error) throw error;
      return data as BoardTemplate[];
    },
    enabled: !!school,
  });

  // Fetch generated reports
  const { data: reports = [] } = useQuery({
    queryKey: ['generated-reports', user?.school_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('generated_reports')
        .select(`
          *,
          student:students(id, full_name, admission_no, section, grade),
          template:board_report_templates(name, board_type)
        `)
        .eq('school_id', user?.school_id!)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as GeneratedReport[];
    },
    enabled: !!user?.school_id,
  });

  // Get students for selected exam group
  const { data: studentsData } = useQuery({
    queryKey: ['exam-students', selectedExamGroup],
    queryFn: async () => {
      if (!selectedExamGroup) return { students: [], marks: [] };
      
      // Get all students who have marks for this exam group
      const { data: marks, error: marksError } = await supabase
        .from('marks')
        .select(`
          student_id,
          exam_paper:exam_papers(
            id,
            section,
            subject,
            max_marks,
            exam_group_id
          ),
          student:students(
            id,
            full_name,
            admission_no,
            section,
            grade
          ),
          marks_obtained,
          is_absent
        `)
        .eq('school_id', user?.school_id!)
        .eq('exam_paper.exam_group_id', selectedExamGroup);
      
      if (marksError) throw marksError;
      
      // Group marks by student
      const studentMarks = marks?.reduce((acc: any, mark: any) => {
        const studentId = mark.student_id;
        if (!acc[studentId]) {
          acc[studentId] = {
            student: mark.student,
            marks: []
          };
        }
        acc[studentId].marks.push(mark);
        return acc;
      }, {});
      
      return {
        students: Object.values(studentMarks || {}),
        totalStudents: Object.keys(studentMarks || {}).length
      };
    },
    enabled: !!selectedExamGroup,
  });

  // Generate reports mutation
  const generateReportsMutation = useMutation({
    mutationFn: async ({ examGroupId, templateId }: { examGroupId: string; templateId: string }) => {
      setIsGenerating(true);
      setGenerationProgress(0);
      
      // Get all students for this exam group
      const students = studentsData?.students || [];
      
      if (students.length === 0) {
        throw new Error('No students found with marks for this exam group');
      }
      
      const totalStudents = students.length;
      let processed = 0;
      
      // Generate reports for each student
      for (const studentData of students) {
        const student = (studentData as any).student;
        const marks = (studentData as any).marks;
        
        // Calculate total marks and grades
        const totalMarks = marks.reduce((sum: number, mark: any) => {
          return sum + (mark.marks_obtained || 0);
        }, 0);
        
        const totalMaxMarks = marks.reduce((sum: number, mark: any) => {
          return sum + (mark.exam_paper?.max_marks || 0);
        }, 0);
        
        const percentage = totalMaxMarks > 0 ? (totalMarks / totalMaxMarks) * 100 : 0;
        
        // Determine grade based on percentage
        let grade = 'F';
        if (percentage >= 90) grade = 'A+';
        else if (percentage >= 80) grade = 'A';
        else if (percentage >= 70) grade = 'B+';
        else if (percentage >= 60) grade = 'B';
        else if (percentage >= 50) grade = 'C';
        else if (percentage >= 40) grade = 'D';
        
        // Prepare report data
        const reportData = {
          student: {
            id: student.id,
            name: student.full_name,
            admission_no: student.admission_no,
            section: student.section,
            grade: student.grade
          },
          marks: marks.map((mark: any) => ({
            subject: mark.exam_paper?.subject,
            marks_obtained: mark.marks_obtained,
            max_marks: mark.exam_paper?.max_marks,
            percentage: mark.exam_paper?.max_marks ? 
              ((mark.marks_obtained || 0) / mark.exam_paper.max_marks) * 100 : 0,
            is_absent: mark.is_absent
          })),
          totals: {
            total_marks: totalMarks,
            total_max_marks: totalMaxMarks,
            percentage: percentage,
            grade: grade,
            result: percentage >= 40 ? 'PASS' : 'FAIL'
          }
        };
        
        // Insert/update report record
        const { error } = await supabase
          .from('generated_reports')
          .upsert({
            school_id: user?.school_id,
            student_id: student.id,
            exam_group_id: examGroupId,
            template_id: templateId,
            report_data: reportData,
            status: 'generated',
            generated_at: new Date().toISOString()
          }, {
            onConflict: 'school_id,student_id,exam_group_id'
          });
        
        if (error) throw error;
        
        processed++;
        setGenerationProgress(Math.round((processed / totalStudents) * 100));
        
        // Small delay to show progress
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      return { processed: totalStudents };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['generated-reports'] });
      toast.success(`Successfully generated ${data.processed} report cards`);
      setIsGenerating(false);
      setGenerationProgress(0);
      setActiveTab('manage');
    },
    onError: (error: any) => {
      toast.error(`Failed to generate reports: ${error.message}`);
      setIsGenerating(false);
      setGenerationProgress(0);
    },
  });

  // Publish reports mutation
  const publishReportsMutation = useMutation({
    mutationFn: async (reportIds: string[]) => {
      const { error } = await supabase
        .from('generated_reports')
        .update({
          published: true,
          published_at: new Date().toISOString(),
          status: 'published'
        })
        .in('id', reportIds);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generated-reports'] });
      toast.success('Reports published successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to publish reports: ${error.message}`);
    },
  });

  // Preview report function
  const handlePreviewReport = (report: GeneratedReport) => {
    // Get the template data
    const template = templates.find(t => t.id === report.template_id);
    if (!template?.template_html || !template?.template_css) {
      toast.error('Template data not available for preview');
      return;
    }

    // Find exam group for metadata
    const examGroup = examGroups.find(eg => eg.id === report.exam_group_id);
    
    // Prepare data for PDF generation
    const pdfData = {
      student: {
        id: report.student?.id || '',
        name: report.student?.full_name || '',
        admission_no: report.student?.admission_no || '',
        section: report.student?.section || '',
        grade: report.student?.grade || ''
      },
      school: {
        name: school?.name || '',
        address: '', // Add if available in school data
        logo_url: school?.logo_url || '',
        principal_name: '' // Add if available in school data
      },
      exam: {
        name: examGroup?.name || 'Exam',
        type: examGroup?.exam_type || '',
        academic_year: new Date().getFullYear().toString(),
        date_range: examGroup ? `${examGroup.start_date} to ${examGroup.end_date}` : ''
      },
      marks: (report.report_data as any)?.marks || [],
      totals: (report.report_data as any)?.totals || {},
      template: {
        html: template.template_html,
        css: template.template_css,
        board_type: template.board_type
      }
    };

    // Generate and show preview
    try {
      // Import the PDF generator dynamically
      import('@/lib/pdf-generator').then(({ generateReportCardPDF }) => {
        generateReportCardPDF(pdfData);
      });
    } catch (error) {
      console.error('Preview error:', error);
      toast.error('Failed to generate preview');
    }
  };

  // Download report function
  const handleDownloadReport = (report: GeneratedReport) => {
    // Get the template data
    const template = templates.find(t => t.id === report.template_id);
    if (!template?.template_html || !template?.template_css) {
      toast.error('Template data not available for download');
      return;
    }

    // Find exam group for metadata
    const examGroup = examGroups.find(eg => eg.id === report.exam_group_id);
    
    // Prepare data for PDF generation
    const pdfData = {
      student: {
        id: report.student?.id || '',
        name: report.student?.full_name || '',
        admission_no: report.student?.admission_no || '',
        section: report.student?.section || '',
        grade: report.student?.grade || ''
      },
      school: {
        name: school?.name || '',
        address: '', // Add if available in school data
        logo_url: school?.logo_url || '',
        principal_name: '' // Add if available in school data
      },
      exam: {
        name: examGroup?.name || 'Exam',
        type: examGroup?.exam_type || '',
        academic_year: new Date().getFullYear().toString(),
        date_range: examGroup ? `${examGroup.start_date} to ${examGroup.end_date}` : ''
      },
      marks: (report.report_data as any)?.marks || [],
      totals: (report.report_data as any)?.totals || {},
      template: {
        html: template.template_html,
        css: template.template_css,
        board_type: template.board_type
      }
    };

    try {
      // Import the PDF generator dynamically and download as HTML
      import('@/lib/pdf-generator').then(({ downloadReportAsHTML }) => {
        downloadReportAsHTML(pdfData);
        toast.success('Download started!');
      });
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download report');
    }
  };

  const filteredReports = reports.filter(report => {
    const matchesSearch = !searchTerm || 
      report.student?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.student?.admission_no?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'generated': return 'bg-blue-100 text-blue-800';
      case 'published': return 'bg-green-100 text-green-800';
      case 'distributed': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getBoardColor = (boardType: string) => {
    const colors: Record<string, string> = {
      'CBSE': 'bg-blue-100 text-blue-800',
      'ICSE': 'bg-green-100 text-green-800',
      'SSC': 'bg-orange-100 text-orange-800',
      'IB': 'bg-purple-100 text-purple-800',
      'IGCSE': 'bg-pink-100 text-pink-800',
    };
    return colors[boardType] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Report Cards</h1>
        <p className="text-muted-foreground mt-2">
          Generate and manage student report cards using board-specific templates
        </p>
      </div>

      {/* School Info Alert */}
      {school && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>{school.name}</strong> - Board Affiliation: {school.board_affiliation || 'Not Set'}
            {!school.board_affiliation && (
              <span className="text-destructive ml-2">
                Please set board affiliation in school settings to see relevant templates.
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reports.length}</div>
            <p className="text-xs text-muted-foreground">Generated reports</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reports.filter(r => r.published).length}
            </div>
            <p className="text-xs text-muted-foreground">Available to parents</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Exam Groups</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{examGroups.length}</div>
            <p className="text-xs text-muted-foreground">Available for reports</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Templates</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{templates.length}</div>
            <p className="text-xs text-muted-foreground">Available templates</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="generate" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Generate Reports
          </TabsTrigger>
          <TabsTrigger value="manage" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Manage Reports
          </TabsTrigger>
        </TabsList>

        {/* Generate Reports Tab */}
        <TabsContent value="generate" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Generate New Report Cards</CardTitle>
              <CardDescription>
                Select an exam group and template to generate report cards for all students
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Exam Group Selection */}
              <div className="space-y-2">
                <Label htmlFor="examGroup">Select Exam Group</Label>
                <Select value={selectedExamGroup} onValueChange={setSelectedExamGroup}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an exam group..." />
                  </SelectTrigger>
                  <SelectContent>
                    {examGroups.map((exam) => (
                      <SelectItem key={exam.id} value={exam.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{exam.name}</span>
                          <Badge variant="outline" className="ml-2">
                            {exam.exam_type}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Template Selection */}
              {selectedExamGroup && (
                <div className="space-y-2">
                  <Label htmlFor="template">Select Report Template</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {templates.map((template) => (
                      <Card 
                        key={template.id}
                        className={`cursor-pointer transition-colors ${
                          selectedTemplate === template.id ? 'ring-2 ring-primary' : ''
                        }`}
                        onClick={() => setSelectedTemplate(template.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium">{template.name}</h4>
                            <div className="flex items-center gap-2">
                              <Badge className={getBoardColor(template.board_type)}>
                                {template.board_type}
                              </Badge>
                              {template.is_default && (
                                <Badge variant="secondary">Default</Badge>
                              )}
                            </div>
                          </div>
                          {template.description && (
                            <p className="text-sm text-muted-foreground">
                              {template.description}
                            </p>
                          )}
                          <div className="mt-2 text-xs text-muted-foreground">
                            Used by {template.usage_count} schools
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Student Preview */}
              {selectedExamGroup && studentsData && (
                <div className="space-y-2">
                  <Label>Students with Marks</Label>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="h-5 w-5 text-muted-foreground" />
                          <span className="font-medium">
                            {studentsData.totalStudents} students
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Reports will be generated for all students with marks
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Generate Button */}
              <div className="flex justify-end">
                <Button 
                  onClick={() => {
                    if (selectedExamGroup && selectedTemplate) {
                      generateReportsMutation.mutate({
                        examGroupId: selectedExamGroup,
                        templateId: selectedTemplate
                      });
                    }
                  }}
                  disabled={!selectedExamGroup || !selectedTemplate || isGenerating}
                  className="flex items-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Clock className="h-4 w-4 animate-spin" />
                      Generating... ({generationProgress}%)
                    </>
                  ) : (
                    <>
                      <ArrowRight className="h-4 w-4" />
                      Generate Report Cards
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manage Reports Tab */}
        <TabsContent value="manage" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by student name or admission number..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="generated">Generated</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="distributed">Distributed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Reports List */}
          <div className="space-y-4">
            {filteredReports.map((report) => (
              <Card key={report.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium">{report.student?.full_name}</h4>
                        <Badge className={getStatusColor(report.status)}>
                          {report.status}
                        </Badge>
                        {report.template && (
                          <Badge className={getBoardColor(report.template.board_type)}>
                            {report.template.board_type}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Admission: {report.student?.admission_no}</span>
                        <span>Section: {report.student?.section}</span>
                        <span>Grade: {report.student?.grade}</span>
                        {report.generated_at && (
                          <span>Generated: {new Date(report.generated_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => handlePreviewReport(report)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDownloadReport(report)}>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                      {!report.published && (
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => publishReportsMutation.mutate([report.id])}
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Publish
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredReports.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No reports found</h3>
              <p className="text-muted-foreground mb-4">
                {reports.length === 0 
                  ? "Generate your first report cards to get started."
                  : "No reports match your current filters."
                }
              </p>
              {reports.length === 0 && (
                <Button onClick={() => setActiveTab('generate')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Generate Reports
                </Button>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 