'use client';

import { useState, useMemo } from 'react';
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
  Send,
  Filter,
  Search,
  Plus,
  Award,
  Target,
  GraduationCap,
  Settings,
  Edit,
  Trash2,
  Upload,
  BarChart3
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase-client';
import { 
  useSchoolSubjects,
  useCreateSchoolSubject,
  useStateBoardExamGroups,
  useCreateStateBoardExamGroup,
  useStateBoardReports,
  useGenerateStateBoardReports,
  usePublishStateBoardReport,
  useGradingScales,
  DEFAULT_FA_GRADING,
  DEFAULT_SA_GRADING,
  type AssessmentType,
  type SchoolSubject,
  type StateBoardExamGroup,
  type StateBoardReport,
  type CreateSchoolSubjectData,
  type CreateStateBoardExamGroupData,
} from '@erp/common';
import { generateStateBoardReportPDF, StateBoardReportData } from '@/lib/state-board-report-engine';

export default function StateBoardReportsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [selectedAssessmentType, setSelectedAssessmentType] = useState<'FA' | 'SA'>('FA');
  const [selectedAssessmentNumber, setSelectedAssessmentNumber] = useState<number>(1);
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'setup' | 'exams' | 'reports'>('setup');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReport, setSelectedReport] = useState<StateBoardReport | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showSubjectDialog, setShowSubjectDialog] = useState(false);
  const [showExamGroupDialog, setShowExamGroupDialog] = useState(false);
  const [newSubject, setNewSubject] = useState<CreateSchoolSubjectData>({
    subject_name: '',
    subject_code: '',
    grade: parseInt(selectedGrade) || 1,
    academic_year: '2024-25',
    is_active: true,
    display_order: 1,
  });
  const [newExamGroup, setNewExamGroup] = useState<CreateStateBoardExamGroupData>({
    name: '',
    description: '',
    exam_type: 'state_fa1',
    assessment_type: 'FA',
    assessment_number: 1,
    total_marks: 20,
    start_date: '',
    end_date: '',
    is_published: false,
  });

  // Fetch school details
  const { data: school } = useQuery({
    queryKey: ['school-details', user?.school_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schools')
        .select('id, name, state_board_type, assessment_pattern, academic_year, logo_url, address, board_type, board_affiliation')
        .eq('id', user?.school_id!)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.school_id,
  });

  // Check if this is a State Board school
  // Determine if this is a State Board school
  const isStateBoardSchool = useMemo(() => {
    const isStateBoard = school?.state_board_type === 'Telangana' || 
            school?.assessment_pattern === 'State_FA_SA' ||
            school?.board_type === 'State Board' ||
            school?.board_affiliation === 'State Board';
    
    // Debug logging to help troubleshoot
    console.log('State Board Reports - School board detection:', {
      school_name: school?.name,
      state_board_type: school?.state_board_type,
      assessment_pattern: school?.assessment_pattern,
      board_type: school?.board_type,
      board_affiliation: school?.board_affiliation,
      isStateBoardSchool: isStateBoard
    });
    
    return isStateBoard;
  }, [school]);

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

  // Fetch school subjects for selected grade
  const { data: schoolSubjects = [] } = useSchoolSubjects(
    user?.school_id || undefined, 
    selectedGrade ? parseInt(selectedGrade) : undefined, 
    school?.academic_year
  );

  // Fetch State Board exam groups
  const { data: examGroups = [] } = useStateBoardExamGroups(user?.school_id || undefined, selectedAssessmentType);

  // Fetch grading scales
  const { data: gradingScales = [] } = useGradingScales(user?.school_id || undefined);

  // Fetch State Board reports
  const { data: reports = [] } = useStateBoardReports(user?.school_id || undefined);

  // Create subject mutation
  const createSubjectMutation = useCreateSchoolSubject();

  // Create exam group mutation
  const createExamGroupMutation = useCreateStateBoardExamGroup();

  // Generate reports mutation
  const generateReportsMutation = useGenerateStateBoardReports();

  // Publish report mutation
  const publishReportMutation = usePublishStateBoardReport();

  // Statistics
  const stats = useMemo(() => {
    const totalSubjects = schoolSubjects.length;
    const totalExamGroups = examGroups.length;
    const totalReports = reports.length;
    const publishedReports = reports.filter(r => r.is_published).length;

    return [
      {
        title: "School Subjects",
        value: totalSubjects,
        description: `Configured for Grade ${selectedGrade || 'All'}`,
        icon: BookOpen,
        color: "bg-blue-500",
      },
      {
        title: "Exam Groups",
        value: totalExamGroups,
        description: `${selectedAssessmentType} assessments`,
        icon: Calendar,
        color: "bg-green-500",
      },
      {
        title: "Generated Reports",
        value: totalReports,
        description: "All assessments",
        icon: FileText,
        color: "bg-purple-500",
      },
      {
        title: "Published Reports",
        value: publishedReports,
        description: "Available to parents",
        icon: CheckCircle,
        color: "bg-emerald-500",
      },
    ];
  }, [schoolSubjects, examGroups, reports, selectedGrade, selectedAssessmentType]);

  // Handle subject creation
  const handleCreateSubject = async () => {
    try {
      await createSubjectMutation.mutateAsync(newSubject);
      toast.success('Subject created successfully');
      setShowSubjectDialog(false);
      setNewSubject({
        subject_name: '',
        subject_code: '',
        grade: parseInt(selectedGrade) || 1,
        academic_year: '2024-25',
        is_active: true,
        display_order: 1,
      });
    } catch (error) {
      toast.error('Failed to create subject');
    }
  };

  // Handle exam group creation
  const handleCreateExamGroup = async () => {
    try {
      const examType = `state_${selectedAssessmentType.toLowerCase()}${selectedAssessmentNumber}`;
      await createExamGroupMutation.mutateAsync({
        ...newExamGroup,
        exam_type: examType,
        assessment_type: selectedAssessmentType,
        assessment_number: selectedAssessmentNumber,
        total_marks: selectedAssessmentType === 'FA' ? 20 : 100,
      });
      toast.success('Exam group created successfully');
      setShowExamGroupDialog(false);
      setNewExamGroup({
        name: '',
        description: '',
        exam_type: 'state_fa1',
        assessment_type: 'FA',
        assessment_number: 1,
        total_marks: 20,
        start_date: '',
        end_date: '',
        is_published: false,
      });
    } catch (error) {
      toast.error('Failed to create exam group');
    }
  };

  // Handle report generation
  const handleGenerateReports = async (examGroupId: string) => {
    try {
      setIsGenerating(true);
      setGenerationProgress(0);

      // Get students in selected section
      const { data: studentsData, error } = await supabase
        .from('students')
        .select('id, full_name')
        .eq('school_id', user?.school_id!)
        .eq('grade', selectedGrade)
        .eq('section', selectedSection);

      if (error) throw error;
      if (!studentsData?.length) {
        toast.error('No students found in selected section');
        return;
      }

      const studentIds = studentsData.map(s => s.id);

      await generateReportsMutation.mutateAsync({
        examGroupId,
        studentIds,
      });

      setGenerationProgress(100);
      toast.success(`Generated reports for ${studentIds.length} students`);
      setActiveTab('reports');
    } catch (error) {
      toast.error('Failed to generate reports');
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  };

  // Handle report preview
  const handlePreviewReport = async (report: StateBoardReport) => {
    try {
      // Fetch additional data needed for report
      const { data: studentData } = await supabase
        .from('students')
        .select('*')
        .eq('id', report.student_id)
        .single();

      const { data: examGroupData } = await supabase
        .from('exam_groups')
        .select('*')
        .eq('id', report.exam_group_id)
        .single();

      const reportData: StateBoardReportData = {
        student: {
          id: studentData.id,
          full_name: studentData.full_name,
          admission_no: studentData.admission_no,
          section: studentData.section,
          grade: studentData.grade,
          father_name: studentData.father_name,
          mother_name: studentData.mother_name,
        },
        school: {
          name: school?.name || 'School Name',
          address: school?.address || 'School Address',
          logo_url: school?.logo_url,
        },
        exam: {
          name: examGroupData.name,
          type: (report.report_type === 'FA' || report.report_type === 'SA') ? report.report_type : 'FA',
          assessment_number: report.assessment_number || 1,
          academic_year: report.academic_year,
          date_range: `${examGroupData.start_date} to ${examGroupData.end_date}`,
        },
        subject_marks: report.subject_marks,
        total_marks: report.total_marks,
        obtained_marks: report.obtained_marks,
        percentage: report.percentage,
        overall_grade: report.overall_grade,
        overall_remark: report.overall_remark,
        attendance: report.attendance_data,
        grading_legend: (report.report_type === 'FA' || report.report_type === 'SA') 
          ? (report.report_type === 'FA' ? DEFAULT_FA_GRADING : DEFAULT_SA_GRADING)
          : DEFAULT_FA_GRADING,
      };

      await generateStateBoardReportPDF(reportData);
    } catch (error) {
      toast.error('Failed to preview report');
    }
  };

  // Show access restriction for non-State Board schools
  if (!isStateBoardSchool) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              State Board Reports Only
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This page is only available for State Board affiliated schools. 
              Your school is configured for <strong>{school?.state_board_type || school?.assessment_pattern || 'CBSE'}</strong> pattern.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Please contact your administrator to change the board type in school settings.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-blue-600" />
            State Board Report Cards
          </h1>
          <p className="text-gray-600 mt-2">
            Generate FA and SA report cards for Telangana State Board
          </p>
        </div>
        <Badge className="bg-green-100 text-green-800 text-lg px-4 py-2">
          {school?.state_board_type} State Board - {school?.assessment_pattern}
        </Badge>
      </div>

      {/* School Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            {school?.name} - Academic Year {school?.academic_year}
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="glass-morphism border-0 hover:shadow-lg transition-all duration-300">
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

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="setup" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Subject Setup
          </TabsTrigger>
          <TabsTrigger value="exams" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Exam Groups
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Reports
          </TabsTrigger>
        </TabsList>

        {/* Subject Setup Tab */}
        <TabsContent value="setup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configure School Subjects</CardTitle>
              <CardDescription>
                Set up subjects for each grade that will be used in assessments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Grade Selection */}
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label htmlFor="grade">Select Grade</Label>
                  <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a grade" />
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
                <Dialog open={showSubjectDialog} onOpenChange={setShowSubjectDialog}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Add Subject
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Subject</DialogTitle>
                      <DialogDescription>
                        Add a subject for Grade {selectedGrade || 'N/A'}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="subject_name">Subject Name</Label>
                        <Input
                          id="subject_name"
                          value={newSubject.subject_name}
                          onChange={(e) => setNewSubject({ ...newSubject, subject_name: e.target.value })}
                          placeholder="e.g., Mathematics, Science"
                        />
                      </div>
                      <div>
                        <Label htmlFor="subject_code">Subject Code (Optional)</Label>
                        <Input
                          id="subject_code"
                          value={newSubject.subject_code}
                          onChange={(e) => setNewSubject({ ...newSubject, subject_code: e.target.value })}
                          placeholder="e.g., MATH, SCI"
                        />
                      </div>
                      <div>
                        <Label htmlFor="display_order">Display Order</Label>
                        <Input
                          id="display_order"
                          type="number"
                          value={newSubject.display_order}
                          onChange={(e) => setNewSubject({ ...newSubject, display_order: parseInt(e.target.value) })}
                          min="1"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowSubjectDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateSubject} disabled={!newSubject.subject_name || !selectedGrade}>
                        Add Subject
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Subjects List */}
              {selectedGrade && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">
                    Subjects for Grade {selectedGrade} ({schoolSubjects.length})
                  </h3>
                  {schoolSubjects.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {schoolSubjects.map((subject) => (
                        <Card key={subject.id} className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{subject.subject_name}</h4>
                              {subject.subject_code && (
                                <p className="text-sm text-gray-500">Code: {subject.subject_code}</p>
                              )}
                              <p className="text-xs text-gray-400">Order: {subject.display_order}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button size="sm" variant="outline">
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="outline">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card className="p-8 text-center">
                      <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No subjects configured</h3>
                      <p className="text-gray-500 mb-4">
                        Add subjects for Grade {selectedGrade} to start creating assessments
                      </p>
                    </Card>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Exam Groups Tab */}
        <TabsContent value="exams" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Exam Groups & Assessments</CardTitle>
              <CardDescription>
                Create and manage FA/SA assessments for report generation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Assessment Type Selection */}
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label>Assessment Type</Label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    {(['FA', 'SA'] as ('FA' | 'SA')[]).map((type) => (
                      <Card 
                        key={type}
                        className={`cursor-pointer transition-colors p-4 ${
                          selectedAssessmentType === type ? 'ring-2 ring-primary' : ''
                        }`}
                        onClick={() => setSelectedAssessmentType(type)}
                      >
                        <div className="flex items-center gap-3">
                          <Target className="h-5 w-5 text-blue-600" />
                          <div>
                            <h4 className="font-medium">{type}</h4>
                            <p className="text-sm text-muted-foreground">
                              {type === 'FA' ? 'Formative Assessment (20 marks)' : 'Summative Assessment (100 marks)'}
                            </p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
                <div className="flex-1">
                  <Label>Assessment Number</Label>
                  <Select 
                    value={selectedAssessmentNumber.toString()} 
                    onValueChange={(value) => setSelectedAssessmentNumber(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4].map((num) => (
                        <SelectItem key={num} value={num.toString()}>
                          {selectedAssessmentType}-{num}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Dialog open={showExamGroupDialog} onOpenChange={setShowExamGroupDialog}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2 self-end">
                      <Plus className="h-4 w-4" />
                      Create Exam Group
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Create Exam Group</DialogTitle>
                      <DialogDescription>
                        Create {selectedAssessmentType}-{selectedAssessmentNumber} exam group
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="exam_name">Exam Name</Label>
                        <Input
                          id="exam_name"
                          value={newExamGroup.name}
                          onChange={(e) => setNewExamGroup({ ...newExamGroup, name: e.target.value })}
                          placeholder={`${selectedAssessmentType}-${selectedAssessmentNumber} ${new Date().getFullYear()}`}
                        />
                      </div>
                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Input
                          id="description"
                          value={newExamGroup.description}
                          onChange={(e) => setNewExamGroup({ ...newExamGroup, description: e.target.value })}
                          placeholder="Optional description"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="start_date">Start Date</Label>
                          <Input
                            id="start_date"
                            type="date"
                            value={newExamGroup.start_date}
                            onChange={(e) => setNewExamGroup({ ...newExamGroup, start_date: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="end_date">End Date</Label>
                          <Input
                            id="end_date"
                            type="date"
                            value={newExamGroup.end_date}
                            onChange={(e) => setNewExamGroup({ ...newExamGroup, end_date: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="is_published"
                          checked={newExamGroup.is_published}
                          onCheckedChange={(checked) => setNewExamGroup({ ...newExamGroup, is_published: checked })}
                        />
                        <Label htmlFor="is_published">Publish immediately</Label>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowExamGroupDialog(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleCreateExamGroup} 
                        disabled={!newExamGroup.name || !newExamGroup.start_date || !newExamGroup.end_date}
                      >
                        Create Exam Group
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Exam Groups List */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">
                  {selectedAssessmentType} Exam Groups ({examGroups.length})
                </h3>
                {examGroups.length > 0 ? (
                  <div className="space-y-4">
                    {examGroups.map((examGroup) => (
                      <Card key={examGroup.id} className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                              <Calendar className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <h4 className="text-lg font-semibold">{examGroup.name}</h4>
                              <p className="text-sm text-gray-600">{examGroup.description}</p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                <span>📅 {examGroup.start_date} to {examGroup.end_date}</span>
                                <span>📊 Max Marks: {examGroup.total_marks}</span>
                                {examGroup.is_published && (
                                  <Badge className="bg-green-100 text-green-800">Published</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() => handleGenerateReports(examGroup.id)}
                              disabled={!selectedGrade || !selectedSection || isGenerating}
                              className="flex items-center gap-2"
                            >
                              {isGenerating ? (
                                <>
                                  <Clock className="h-4 w-4 animate-spin" />
                                  Generating...
                                </>
                              ) : (
                                <>
                                  <BarChart3 className="h-4 w-4" />
                                  Generate Reports
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="p-8 text-center">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No exam groups found</h3>
                    <p className="text-gray-500 mb-4">
                      Create {selectedAssessmentType}-{selectedAssessmentNumber} exam group to start generating reports
                    </p>
                  </Card>
                )}
              </div>

              {/* Grade & Section Selection for Report Generation */}
              {examGroups.length > 0 && (
                <Card className="p-6 bg-blue-50">
                  <h3 className="text-lg font-semibold mb-4">Report Generation Settings</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="report_grade">Grade</Label>
                      <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select grade" />
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
                      <Label htmlFor="report_section">Section</Label>
                      <Select value={selectedSection} onValueChange={setSelectedSection}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select section" />
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
                  </div>
                  {selectedGrade && selectedSection && (
                    <Alert className="mt-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Reports will be generated for all students in Grade {selectedGrade} Section {selectedSection}
                      </AlertDescription>
                    </Alert>
                  )}
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Generated State Board Reports</CardTitle>
              <CardDescription>
                View, download, and manage generated report cards
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Search and Filters */}
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search by student name, admission no..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Reports List */}
              <div className="space-y-4">
                {reports.length > 0 ? (
                  reports
                    .filter(report => 
                      report.student?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      report.student?.admission_no?.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((report) => (
                      <Card key={report.id} className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
                              <FileText className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <h4 className="text-lg font-semibold">{report.student?.full_name}</h4>
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <span>📝 {report.report_type}-{report.assessment_number}</span>
                                <span>🎓 Grade {report.student?.grade} {report.student?.section}</span>
                                <span>📊 {report.obtained_marks}/{report.total_marks} ({report.percentage.toFixed(1)}%)</span>
                                {report.overall_grade && (
                                  <Badge className="bg-blue-100 text-blue-800">
                                    Grade {report.overall_grade}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge 
                                  className={
                                    report.status === 'published' ? 'bg-green-100 text-green-800' :
                                    report.status === 'generated' ? 'bg-blue-100 text-blue-800' :
                                    'bg-gray-100 text-gray-800'
                                  }
                                >
                                  {report.status}
                                </Badge>
                                {report.is_published && (
                                  <Badge className="bg-emerald-100 text-emerald-800">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Published
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePreviewReport(report)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Preview
                            </Button>
                            {!report.is_published && (
                              <Button
                                size="sm"
                                onClick={() => publishReportMutation.mutate(report.id)}
                              >
                                <Send className="h-4 w-4 mr-2" />
                                Publish
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))
                ) : (
                  <Card className="p-8 text-center">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No reports generated</h3>
                    <p className="text-gray-500 mb-4">
                      Generate reports from the Exam Groups tab to see them here
                    </p>
                  </Card>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 