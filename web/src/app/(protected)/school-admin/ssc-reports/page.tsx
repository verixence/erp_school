'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  FileText,
  Users, 
  Calendar, 
  Award, 
  TrendingUp, 
  Search,
  Filter,
  Download,
  Eye,
  BarChart3,
  ChevronRight,
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  Plus,
  Loader2,
  ExternalLink,
  Target,
  BookOpen,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';

import { useAuth } from '@/hooks/use-auth';
import { 
  useExamGroups,
  useSchoolSections,
  useStateBoardReports,
  useGenerateStateBoardReports,
  usePublishStateBoardReport,
  useMonthlyAttendance,

  type StateBoardReport,
  type AssessmentType
} from '@erp/common';
import { generateStateBoardReportPDF } from '@/lib/state-board-report-engine';
import { supabase } from '@/lib/supabase-client';
import { toast } from 'sonner';

export default function SSCReportsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [selectedAssessmentType, setSelectedAssessmentType] = useState<AssessmentType>('FA');
  const [selectedAssessmentNumber, setSelectedAssessmentNumber] = useState<number>(1);
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'generate' | 'manage'>('generate');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const reportsPerPage = 10;

  // Fetch school details
  const { data: school } = useQuery({
    queryKey: ['school-details', user?.school_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schools')
        .select('id, name, board_type, state_board_type, assessment_pattern, academic_year, logo_url, address, board_affiliation')
        .eq('id', user?.school_id!)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.school_id,
  });

  // API hooks
  const { data: examGroups = [] } = useExamGroups(user?.school_id || undefined);
  const { data: sections = [] } = useSchoolSections(user?.school_id || undefined);
  const { data: reports = [] } = useStateBoardReports(user?.school_id || undefined);

  const generateReportsMutation = useGenerateStateBoardReports();
  const publishReportMutation = usePublishStateBoardReport();

  // Filter exam groups for State Board
  const stateBoardExamGroups = useMemo(() => {
    return examGroups.filter(group => 
      group.exam_type.startsWith('state_') && 
      group.exam_type.includes(selectedAssessmentType.toLowerCase())
    );
  }, [examGroups, selectedAssessmentType, selectedAssessmentNumber]);

  // Get grades from sections
  const grades = useMemo(() => {
    const uniqueGrades = [...new Set(sections.map(section => section.grade).filter(grade => grade != null))];
    return uniqueGrades.sort((a, b) => a - b);
  }, [sections]);

  // Get sections for selected grade
  const gradeSection = useMemo(() => {
    if (!selectedGrade) return [];
    return sections.filter(section => section.grade === parseInt(selectedGrade));
  }, [sections, selectedGrade]);

  // Filter reports
  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      const matchesSearch = report.student?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           report.student?.admission_no?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
      const matchesAssessment = report.report_type === selectedAssessmentType && 
                               report.assessment_number === selectedAssessmentNumber;
      
      return matchesSearch && matchesStatus && matchesAssessment;
    });
  }, [reports, searchTerm, statusFilter, selectedAssessmentType, selectedAssessmentNumber]);

  // Pagination
  const totalPages = Math.ceil(filteredReports.length / reportsPerPage);
  const paginatedReports = filteredReports.slice(
    (currentPage - 1) * reportsPerPage,
    currentPage * reportsPerPage
  );

  // Statistics
  const stats = useMemo(() => {
    const total = filteredReports.length;
    const generated = filteredReports.filter(r => r.status === 'generated').length;
    const published = filteredReports.filter(r => r.status === 'published').length;
    const draft = filteredReports.filter(r => r.status === 'draft').length;

    return { total, generated, published, draft };
  }, [filteredReports]);

  // Handle report generation
  const handleGenerateReports = async () => {
    if (!selectedGrade || !selectedSection) {
      toast.error('Please select grade and section');
      return;
    }

    const selectedExamGroup = stateBoardExamGroups[0];
    if (!selectedExamGroup) {
      toast.error(`No ${selectedAssessmentType}-${selectedAssessmentNumber} exam group found`);
      return;
    }

    // Get students in the selected section
    const { data: sectionData, error: sectionError } = await supabase
      .from('sections')
      .select(`
        id,
        students (
          id,
          full_name,
          admission_no
        )
      `)
      .eq('grade', parseInt(selectedGrade))
      .eq('section', selectedSection)
      .eq('school_id', user?.school_id)
      .single();

    if (sectionError || !sectionData?.students) {
      toast.error('Failed to fetch students');
      return;
    }

    const studentIds = sectionData.students.map((student: any) => student.id);
    
    setIsGenerating(true);
    setGenerationProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      await generateReportsMutation.mutateAsync({
        examGroupId: selectedExamGroup.id,
        studentIds
      });

      clearInterval(progressInterval);
      setGenerationProgress(100);
      
      setTimeout(() => {
        setIsGenerating(false);
        setGenerationProgress(0);
        setActiveTab('manage');
      }, 1000);

    } catch (error) {
      setIsGenerating(false);
      setGenerationProgress(0);
      console.error('Error generating reports:', error);
    }
  };

  // Handle report preview
  const handlePreviewReport = async (report: StateBoardReport) => {
    try {
      if (!school) {
        toast.error('School information not found');
        return;
      }

      // Extract parent name from student_parents relationship
      const parentName = report.student?.student_parents?.[0]?.parent
        ? `${report.student.student_parents[0].parent.first_name} ${report.student.student_parents[0].parent.last_name}`
        : '';

      const reportData = {
        student: {
          id: report.student_id,
          full_name: report.student?.full_name || '',
          admission_no: report.student?.admission_no || '',
          section: report.student?.section || '',
          grade: report.student?.grade || '',
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
          type: (report.report_type === 'FA' || report.report_type === 'SA') ? report.report_type : 'FA',
          assessment_number: report.assessment_number || 1,
          academic_year: report.academic_year,
          date_range: `${report.exam_group?.start_date || ''} to ${report.exam_group?.end_date || ''}`,
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
      toast.error('Failed to preview report');
    }
  };

  // Handle bulk publish
  const handleBulkPublish = async () => {
    if (selectedReports.length === 0) {
      toast.error('Please select reports to publish');
      return;
    }

    try {
      await Promise.all(
        selectedReports.map(reportId => publishReportMutation.mutateAsync(reportId))
      );
      setSelectedReports([]);
      toast.success(`Published ${selectedReports.length} reports successfully`);
    } catch (error) {
      toast.error('Failed to publish reports');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'generated': return 'bg-blue-100 text-blue-800';
      case 'published': return 'bg-green-100 text-green-800';
      case 'distributed': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Determine if this is a State Board school
  const isStateBoardSchool = useMemo(() => {
    const isStateBoard = school?.state_board_type === 'Telangana' || 
            school?.assessment_pattern === 'State_FA_SA' ||
            school?.board_type === 'State Board' ||
            school?.board_affiliation === 'State Board';
    
    // Debug logging to help troubleshoot
    console.log('SSC Reports - School board detection:', {
      school_name: school?.name,
      state_board_type: school?.state_board_type,
      assessment_pattern: school?.assessment_pattern,
      board_type: school?.board_type,
      board_affiliation: school?.board_affiliation,
      isStateBoardSchool: isStateBoard
    });
    
    return isStateBoard;
  }, [school]);

  if (!isStateBoardSchool) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              State Board Not Enabled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              This school is not configured for State Board assessments. Please contact your system administrator to enable State Board features.
            </p>
            <Button variant="outline" onClick={() => window.history.back()}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            SSC Reports Management
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Generate and manage State Board FA and SA assessment reports for {school?.name}
          </p>
        </motion.div>

        {/* Assessment Type Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="glass-morphism border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-600" />
                Assessment Selection
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label>Assessment Type</Label>
                  <Select value={selectedAssessmentType} onValueChange={(value: AssessmentType) => setSelectedAssessmentType(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FA">FA - Formative Assessment (20 marks)</SelectItem>
                      <SelectItem value="SA">SA - Summative Assessment (100 marks)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Assessment Number</Label>
                  <Select value={selectedAssessmentNumber.toString()} onValueChange={(value) => setSelectedAssessmentNumber(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select number" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedAssessmentType === 'FA' ? (
                        <>
                          <SelectItem value="1">FA-1</SelectItem>
                          <SelectItem value="2">FA-2</SelectItem>
                          <SelectItem value="3">FA-3</SelectItem>
                          <SelectItem value="4">FA-4</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="1">SA-1</SelectItem>
                          <SelectItem value="2">SA-2</SelectItem>
                          <SelectItem value="3">SA-3</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Grade</Label>
                  <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent>
                      {grades.map(grade => (
                        <SelectItem key={grade} value={grade.toString()}>Grade {grade}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Section</Label>
                  <Select value={selectedSection} onValueChange={setSelectedSection} disabled={!selectedGrade}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select section" />
                    </SelectTrigger>
                    <SelectContent>
                      {gradeSection.map(section => (
                        <SelectItem key={section.id} value={section.section}>{section.section}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'generate' | 'manage')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="generate">Generate Reports</TabsTrigger>
              <TabsTrigger value="manage">Manage Reports</TabsTrigger>
            </TabsList>

            {/* Generate Tab */}
            <TabsContent value="generate" className="space-y-6">
              <Card className="glass-morphism border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5 text-green-600" />
                    Generate {selectedAssessmentType}-{selectedAssessmentNumber} Reports
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {stateBoardExamGroups.length > 0 ? (
                    <>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                          <span className="font-medium text-green-800">Exam Group Available</span>
                        </div>
                        <p className="text-green-700">
                          Found exam group: <strong>{stateBoardExamGroups[0].name}</strong>
                        </p>
                      </div>

                      {isGenerating ? (
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                            <span>Generating reports...</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${generationProgress}%` }}
                            />
                          </div>
                          <p className="text-sm text-gray-600">
                            Processing {selectedAssessmentType}-{selectedAssessmentNumber} reports for Grade {selectedGrade}-{selectedSection}
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4">
                          <Button 
                            onClick={handleGenerateReports}
                            disabled={!selectedGrade || !selectedSection}
                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            Generate Reports for Grade {selectedGrade}-{selectedSection}
                          </Button>
                          <div className="text-sm text-gray-600">
                            This will generate {selectedAssessmentType}-{selectedAssessmentNumber} reports for all students in the selected section
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-5 w-5 text-orange-600" />
                        <span className="font-medium text-orange-800">No Exam Group Found</span>
                      </div>
                      <p className="text-orange-700 mb-4">
                        No {selectedAssessmentType}-{selectedAssessmentNumber} exam group found. Please create an exam group first.
                      </p>
                      <Button variant="outline" onClick={() => window.open('/school-admin/exams', '_blank')}>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Create Exam Group
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Manage Tab */}
            <TabsContent value="manage" className="space-y-6">
              {/* Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="glass-morphism border-0">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Reports</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                      </div>
                      <FileText className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass-morphism border-0">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Generated</p>
                        <p className="text-2xl font-bold text-blue-600">{stats.generated}</p>
                      </div>
                      <Award className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass-morphism border-0">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Published</p>
                        <p className="text-2xl font-bold text-green-600">{stats.published}</p>
                      </div>
                      <CheckCircle2 className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass-morphism border-0">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Draft</p>
                        <p className="text-2xl font-bold text-orange-600">{stats.draft}</p>
                      </div>
                      <AlertCircle className="h-8 w-8 text-orange-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Filters */}
              <Card className="glass-morphism border-0">
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Search Reports</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search by student name or admission number..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Status Filter</Label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="All statuses" />
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
                    <div className="flex items-end">
                      <Button 
                        onClick={handleBulkPublish}
                        disabled={selectedReports.length === 0}
                        variant="outline"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Publish Selected ({selectedReports.length})
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Reports Table */}
              <Card className="glass-morphism border-0">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-purple-600" />
                      {selectedAssessmentType}-{selectedAssessmentNumber} Reports
                    </div>
                    <Badge variant="outline">{filteredReports.length} reports</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {paginatedReports.length > 0 ? (
                    <>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">
                                <Checkbox
                                  checked={selectedReports.length === paginatedReports.length}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedReports(paginatedReports.map(r => r.id));
                                    } else {
                                      setSelectedReports([]);
                                    }
                                  }}
                                />
                              </TableHead>
                              <TableHead>Student</TableHead>
                              <TableHead>Assessment</TableHead>
                              <TableHead className="text-center">Total Marks</TableHead>
                              <TableHead className="text-center">Obtained</TableHead>
                              <TableHead className="text-center">Percentage</TableHead>
                              <TableHead className="text-center">Grade</TableHead>
                              <TableHead className="text-center">Status</TableHead>
                              <TableHead>Generated</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paginatedReports.map((report) => (
                              <TableRow key={report.id}>
                                <TableCell>
                                  <Checkbox
                                    checked={selectedReports.includes(report.id)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setSelectedReports([...selectedReports, report.id]);
                                      } else {
                                        setSelectedReports(selectedReports.filter(id => id !== report.id));
                                      }
                                    }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <div className="font-medium">{report.student?.full_name}</div>
                                    <div className="text-sm text-gray-500">{report.student?.admission_no}</div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline">
                                      {report.report_type}-{report.assessment_number}
                                    </Badge>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">{report.total_marks || 0}</TableCell>
                                <TableCell className="text-center">{report.obtained_marks || 0}</TableCell>
                                <TableCell className="text-center">{report.percentage ? report.percentage.toFixed(1) : '0.0'}%</TableCell>
                                <TableCell className="text-center">
                                  {report.overall_grade && (
                                    <Badge className="bg-blue-100 text-blue-800">
                                      {report.overall_grade}
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge className={getStatusColor(report.status)}>
                                    {report.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm text-gray-600">
                                    {new Date(report.generated_at).toLocaleDateString()}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handlePreviewReport(report)}
                                    >
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                    {report.status === 'generated' && (
                                      <Button
                                        size="sm"
                                        onClick={() => publishReportMutation.mutate(report.id)}
                                        disabled={publishReportMutation.isPending}
                                      >
                                        <CheckCircle2 className="w-4 h-4" />
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Pagination */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4">
                          <div className="text-sm text-gray-600">
                            Showing {(currentPage - 1) * reportsPerPage + 1} to{' '}
                            {Math.min(currentPage * reportsPerPage, filteredReports.length)} of{' '}
                            {filteredReports.length} reports
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                              disabled={currentPage === 1}
                            >
                              Previous
                            </Button>
                            <span className="text-sm">
                              Page {currentPage} of {totalPages}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                              disabled={currentPage === totalPages}
                            >
                              Next
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-12">
                      <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No reports found</h3>
                      <p className="text-gray-500 mb-6">
                        No {selectedAssessmentType}-{selectedAssessmentNumber} reports match your current filters.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
} 