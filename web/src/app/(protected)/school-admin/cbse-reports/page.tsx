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
  GraduationCap
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
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase-client';
import { 
  SubjectMarks,
  CBSEReportData,
  CBSEGeneratedReport,
  School,
  ExamGroup,
  CBSEExamGroup,
  CalculatedSubject,
  CoScholasticAssessment,
  TermReportData,
  CumulativeReportData,
  isCumulativeReport,
  isTermReport
} from '@/types/cbse-reports';

declare global {
  interface Window {
    JSZip: any;
    html2pdf: any;
  }
}

export default function CBSEReportsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [selectedTerm, setSelectedTerm] = useState<'Term1' | 'Term2' | 'Cumulative'>('Term1');
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'generate' | 'manage'>('generate');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedReport, setSelectedReport] = useState<CBSEGeneratedReport | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [includeCoScholastic, setIncludeCoScholastic] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const reportsPerPage = 10;

  // Fetch school details
  const { data: school } = useQuery({
    queryKey: ['school-details', user?.school_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schools')
        .select('id, name, board_type, grading_scale, academic_year, logo_url')
        .eq('id', user?.school_id!)
        .single();
      
      if (error) throw error;
      return data as School;
    },
    enabled: !!user?.school_id,
  });

  // Helper function to determine grade from GPA
  const determineGrade = (gpa: number): string => {
    if (gpa >= 9.1) return 'A1';
    if (gpa >= 8.1) return 'A2';
    if (gpa >= 7.1) return 'B1';
    if (gpa >= 6.1) return 'B2';
    if (gpa >= 5.1) return 'C1';
    if (gpa >= 4.1) return 'C2';
    if (gpa >= 3.1) return 'D';
    return 'E';
  };

  // Helper function to get relevant exam groups for a term
  const getRelevantExamGroups = (examGroups: ExamGroup[], term: string): string[] => {
    if (term === 'Term1') {
      return examGroups
        .filter(eg => ['cbse_fa1', 'cbse_fa2', 'cbse_sa1'].includes(eg.exam_type))
        .map(eg => eg.id);
    } else if (term === 'Term2') {
      return examGroups
        .filter(eg => ['cbse_fa3', 'cbse_fa4', 'cbse_sa2'].includes(eg.exam_type))
        .map(eg => eg.id);
    }
    return [];
  };

  // Type guard for SubjectMarks
  const isSubjectMarks = (subject: any): subject is SubjectMarks => {
    return (
      typeof subject === 'object' &&
      typeof subject.name === 'string' &&
      (typeof subject.final_gpa === 'number' || subject.final_gpa === undefined) &&
      (typeof subject.final_grade === 'string' || subject.final_grade === undefined)
    );
  };

  // Helper function to calculate overall result
  const calculateOverallResult = (subjects: SubjectMarks[]) => {
    const validSubjects = subjects.filter(s => typeof s.final_gpa === 'number');
    if (validSubjects.length === 0) {
      return { gpa: 0, grade: 'F' };
    }
    const gpa = validSubjects.reduce((sum, subject) => sum + (subject as { final_gpa: number }).final_gpa, 0) / validSubjects.length;
    return {
      gpa,
      grade: determineGrade(gpa)
    };
  };

  // Helper function to generate report data
  const generateReportData = (
    student: {
      id: string;
      full_name: string;
      admission_no?: string;
      section?: string;
      grade?: string;
    },
    subjects: SubjectMarks[],
    overallResult: { gpa: number; grade: string },
    term: 'Term1' | 'Term2',
    coScholastic?: CoScholasticAssessment
  ): TermReportData => {
    const reportData: TermReportData = {
      student: {
        id: student.id,
        full_name: student.full_name,
        admission_no: student.admission_no,
        section: student.section,
        grade: student.grade
      },
      subjects,
      coScholastic,
      attendance: {
        working_days: 0, // To be filled with actual data
        present_days: 0,
        percentage: 0
      },
      term,
      overall_gpa: overallResult.gpa,
      overall_grade: overallResult.grade
    };

    return reportData;
  };

  // Helper function to generate cumulative report data
  const generateCumulativeReportData = (
    student: {
      id: string;
      full_name: string;
      admission_no?: string;
      section?: string;
      grade?: string;
    },
    subjects: SubjectMarks[],
    term1GPA: number,
    term2GPA: number,
    finalGPA: number,
    finalGrade: string,
    coScholastic?: CoScholasticAssessment
  ): CBSEReportData => {
    const reportData: CumulativeReportData = {
      student: {
        id: student.id,
        full_name: student.full_name,
        admission_no: student.admission_no,
        section: student.section,
        grade: student.grade
      },
      subjects,
      coScholastic,
      attendance: {
        working_days: 0, // To be filled with actual data
        present_days: 0,
        percentage: 0
      },
      term1_gpa: term1GPA,
      term2_gpa: term2GPA,
      final_gpa: finalGPA,
      final_grade: finalGrade,
      promotion_status: finalGPA >= 3.3 ? 'PROMOTED' : 'DETAINED' // Example threshold
    };

    return reportData;
  };

  // Helper function to get report GPA and grade
  const getReportGPAAndGrade = (report: CBSEReportData): { gpa: number; grade: string } => {
    if (isCumulativeReport(report)) {
      return {
        gpa: report.final_gpa,
        grade: report.final_grade
      };
    } else if (isTermReport(report)) {
      return {
        gpa: report.overall_gpa,
        grade: report.overall_grade
      };
    }
    // This should never happen due to type union
    throw new Error('Invalid report type');
  };

  // Helper function to fetch student marks for a term
  const fetchStudentMarksForTerm = async (
    studentId: string,
    examGroups: string[],
    term: string
  ): Promise<SubjectMarks[]> => {
    const { data: marks, error } = await supabase
      .from('marks')
      .select(`
        id,
        subject,
        marks_obtained,
        is_absent,
        exam_papers!inner(
          id,
          max_marks,
          subject,
          exam_group_id,
          exam_groups!inner(
            id,
            name,
            exam_type
          )
        )
      `)
      .eq('student_id', studentId)
      .in('exam_papers.exam_groups.id', examGroups);

    if (error) throw error;

    // Transform marks data into subject-wise format
    const subjectMarks: Record<string, any> = {};

    (marks || []).forEach((mark: any) => {
      const subject = mark.subject || mark.exam_papers.subject;
      const examType = mark.exam_papers.exam_groups.exam_type.replace('cbse_', '').toUpperCase();
      const marksObtained = mark.is_absent ? 0 : Number(mark.marks_obtained);
      const maxMarks = Number(mark.exam_papers.max_marks);
      const gradePoint = marksObtained ? (marksObtained / maxMarks) * 10 : 0;

      if (!subjectMarks[subject]) {
        subjectMarks[subject] = {
          name: subject,
          fa1_gp: undefined,
          fa2_gp: undefined,
          sa1_gp: undefined,
          mid_term_gp: undefined,
          final_gpa: 0,
          final_grade: 'F',
          grade: undefined
        };
      }

      // Map exam types to grade points
      switch (examType) {
        case 'FA1':
          subjectMarks[subject].fa1_gp = gradePoint;
          break;
        case 'FA2':
          subjectMarks[subject].fa2_gp = gradePoint;
          break;
        case 'SA1':
          subjectMarks[subject].sa1_gp = gradePoint;
          break;
        case 'FA3':
          subjectMarks[subject].fa3_gp = gradePoint;
          break;
        case 'FA4':
          subjectMarks[subject].fa4_gp = gradePoint;
          break;
        case 'SA2':
          subjectMarks[subject].sa2_gp = gradePoint;
          break;
      }

      // Calculate mid-term GPA for Term 1
      if (term === 'Term1' && subjectMarks[subject].fa1_gp !== undefined && subjectMarks[subject].fa2_gp !== undefined) {
        subjectMarks[subject].mid_term_gp = (subjectMarks[subject].fa1_gp + subjectMarks[subject].fa2_gp) / 2;
      }

      // Calculate final GPA and grade
      const validGPs = [
        subjectMarks[subject].fa1_gp,
        subjectMarks[subject].fa2_gp,
        subjectMarks[subject].sa1_gp,
        subjectMarks[subject].fa3_gp,
        subjectMarks[subject].fa4_gp,
        subjectMarks[subject].sa2_gp
      ].filter(gp => gp !== undefined);

      if (validGPs.length > 0) {
        const finalGPA = validGPs.reduce((sum, gp) => sum + gp!, 0) / validGPs.length;
        subjectMarks[subject].final_gpa = Number(finalGPA.toFixed(1));
        subjectMarks[subject].final_grade = determineGrade(finalGPA);
      }
    });

    return Object.values(subjectMarks) as SubjectMarks[];
  };

  // Helper function to validate co-scholastic assessment
  const validateCoScholasticAssessment = async (studentId: string, term: string, academicYear: string) => {
    if (!includeCoScholastic) return true; // Skip validation if co-scholastic is not included
    
    // First, let's check what co-scholastic assessments exist for this student
    const { data: allAssessments, error: allError } = await supabase
      .from('co_scholastic_assessments')
      .select('*')
      .eq('student_id', studentId);

    console.log('All assessments for student:', { studentId, allAssessments, allError });

    // Now try the specific query
    const { data, error } = await supabase
      .from('co_scholastic_assessments')
      .select('*')
      .eq('student_id', studentId)
      .eq('term', term)
      .eq('academic_year', academicYear)
      .eq('status', 'completed')
      .limit(1);

    if (error) {
      console.error('Error fetching co-scholastic assessment:', error);
      return false;
    }

    // Log the specific query results
    console.log('Specific assessment query:', {
      studentId,
      term,
      academicYear,
      data,
      error
    });

    return data && data.length > 0;
  };

  // Helper function to fetch co-scholastic assessment
  const fetchCoScholasticAssessment = async (studentId: string, term: string, academicYear: string) => {
    if (!includeCoScholastic) return null; // Return null if co-scholastic is not included
    
    const { data, error } = await supabase
      .from('co_scholastic_assessments')
      .select(`
        id,
        student_id,
        term,
        academic_year,
        oral_expression,
        handwriting,
        general_knowledge,
        activity_sports,
        towards_teachers,
        towards_students,
        towards_school,
        punctuality,
        initiative,
        confidence,
        neatness,
        teacher_remarks,
        status,
        assessed_by (
          id,
          first_name,
          last_name
        )
      `)
      .eq('student_id', studentId)
      .eq('term', term)
      .eq('academic_year', academicYear)
      .eq('status', 'completed')
      .limit(1);

    if (error) {
      console.error('Error fetching co-scholastic assessment:', error);
      return null;
    }

    if (!data?.[0]) return null;

    // Transform the data to match the CoScholasticAssessment interface
    const assessment = data[0];
    return {
      oral_expression: assessment.oral_expression || '-',
      handwriting: assessment.handwriting || '-',
      general_knowledge: assessment.general_knowledge || '-',
      activity_sports: assessment.activity_sports || '-',
      towards_teachers: assessment.towards_teachers || '-',
      towards_students: assessment.towards_students || '-',
      towards_school: assessment.towards_school || '-',
      punctuality: assessment.punctuality || '-',
      initiative: assessment.initiative || '-',
      confidence: assessment.confidence || '-',
      neatness: assessment.neatness || '-',
      teacher_remarks: assessment.teacher_remarks || undefined
    };
  };

  // Only show for CBSE schools
  if (school && school.board_type !== 'CBSE') {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              CBSE Reports Only
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This page is only available for CBSE affiliated schools. 
              Your school is configured for <strong>{school?.board_type || 'Unknown'}</strong> board.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Please contact your administrator to change the board type in school settings.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch CBSE exam groups - automatically detect based on exam_type
  const { data: examGroups = [] } = useQuery({
    queryKey: ['cbse-exam-groups', user?.school_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exam_groups')
        .select('*')
        .eq('school_id', user?.school_id!)
        .in('exam_type', ['FA1', 'FA2', 'SA1', 'FA3', 'FA4', 'SA2']) // Only CBSE exam types
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Transform data to include CBSE details derived from exam_type
      return data.map(group => ({
        ...group,
        cbse_term: group.exam_type.includes('FA1') || group.exam_type.includes('FA2') || group.exam_type.includes('SA1') ? 'Term1' : 'Term2',
        cbse_exam_type: group.exam_type.replace('FA', '').replace('SA', '').toUpperCase(),
      })) as ExamGroup[];
    },
    enabled: !!user?.school_id && school?.board_type === 'CBSE',
  });

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

  // Fetch generated CBSE reports
  const { data: reports = [] } = useQuery({
    queryKey: ['cbse-reports', user?.school_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cbse_generated_reports')
        .select(`
          *,
          student:students(id, full_name, admission_no, section, grade)
        `)
        .eq('school_id', user?.school_id!)
        .order('created_at', { ascending: false });
      
      if (error) {
        // Table might not exist yet, return empty array
        console.warn('CBSE reports table not found:', error);
        return [];
      }
      return data as CBSEGeneratedReport[];
    },
    enabled: !!user?.school_id,
  });

  // Get students for selected grade and section
  const { data: studentsData } = useQuery({
    queryKey: ['cbse-students', selectedGrade, selectedSection, user?.school_id],
    queryFn: async () => {
      if (!selectedGrade || !selectedSection) return [];
      
      // First, get all co-scholastic assessments to verify data exists
      const { data: allAssessments } = await supabase
        .from('co_scholastic_assessments')
        .select('student_id, term, academic_year, status');
      
      console.log('All co-scholastic assessments:', allAssessments);

      const { data, error } = await supabase
        .from('sections')
        .select(`
          id,
          students (
            id,
            full_name,
            admission_no,
            grade,
            section
          )
        `)
        .eq('grade', parseInt(selectedGrade))
        .eq('section', selectedSection)
        .eq('school_id', user?.school_id)
        .single();

      if (error) {
        console.error('Error fetching students:', error);
        return [];
      }

      const students = data?.students || [];
      
      // Log student IDs and matching assessments
      students.forEach(student => {
        const studentAssessments = allAssessments?.filter(a => a.student_id === student.id);
        console.log('Student assessments:', {
          studentId: student.id,
          studentName: student.full_name,
          matchingAssessments: studentAssessments
        });
      });

      return students;
    },
    enabled: !!selectedGrade && !!selectedSection && !!user?.school_id
  });

  // Helper function to create CBSE reports table if needed
  const createCBSEReportsTableIfNeeded = async () => {
    try {
      await supabase.rpc('create_cbse_reports_table_if_not_exists');
    } catch (error) {
      // Fallback: create via direct SQL if RPC doesn't exist
      console.warn('Creating CBSE reports table via fallback method');
    }
  };

  // Publish a report
  const publishReport = async (reportId: string) => {
    try {
      const { error } = await supabase
        .from('cbse_generated_reports')
        .update({
          published: true,
          published_at: new Date().toISOString(),
          status: 'published'
        })
        .eq('id', reportId);

      if (error) throw error;
      
      toast.success('Report published successfully');
      queryClient.invalidateQueries({ queryKey: ['cbse-reports'] });
    } catch (error) {
      console.error('Error publishing report:', error);
      toast.error('Failed to publish report');
    }
  };

  // Preview a report
  const previewReport = (report: CBSEGeneratedReport) => {
    setSelectedReport(report);
    setShowPreview(true);
  };

  // Download report as PDF
  const downloadReport = async (report: CBSEGeneratedReport) => {
    try {
      // Create a simple HTML representation for PDF generation
      const reportHTML = generateReportHTML(report);
      
      // For now, open in a new window - can be enhanced with actual PDF generation
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(reportHTML);
        newWindow.document.close();
        newWindow.print();
      }
      
      toast.success('Report opened for download');
    } catch (error) {
      console.error('Error downloading report:', error);
      toast.error('Failed to download report');
    }
  };

  // Generate HTML for report preview/download
  const generateReportHTML = (report: CBSEGeneratedReport) => {
    const reportData = report.report_data;
    const student = report.student || reportData.student;
    const coScholastic = reportData.coScholastic;
    
    // Get GPA and grade using type guard
    const { gpa, grade } = getReportGPAAndGrade(reportData);
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>CBSE Report Card - ${student.full_name}</title>
          <style>
            @page { size: A4; margin: 20mm; }
            body { 
              font-family: Arial, sans-serif; 
              padding: 0; 
              margin: 0;
              color: #333;
            }
            .container {
              max-width: 210mm;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              display: flex;
              align-items: center;
              margin-bottom: 30px;
              border-bottom: 3px solid #2563eb;
              padding-bottom: 20px;
            }
            .logo {
              width: 80px;
              height: 80px;
              margin-right: 20px;
            }
            .school-info {
              flex: 1;
              text-align: center;
            }
            .school-info h1 {
              margin: 0;
              color: #1e40af;
              font-size: 24px;
            }
            .school-info h2 {
              margin: 10px 0;
              color: #1e40af;
              font-size: 20px;
            }
            .student-info {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 20px;
              margin-bottom: 30px;
            }
            .info-item {
              display: flex;
              gap: 10px;
            }
            .info-label {
              font-weight: bold;
              min-width: 120px;
            }
            .subjects-table, .co-scholastic-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 30px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            .subjects-table th, .subjects-table td,
            .co-scholastic-table th, .co-scholastic-table td { 
              border: 1px solid #e5e7eb; 
              padding: 12px; 
              text-align: center; 
            }
            .subjects-table th, .co-scholastic-table th { 
              background-color: #f3f4f6;
              color: #1e40af;
              font-weight: 600;
            }
            .subjects-table tr:nth-child(even) {
              background-color: #f9fafb;
            }
            .overall { 
              background-color: #f3f4f6;
              padding: 20px;
              border-radius: 8px;
              margin-bottom: 30px;
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 20px;
            }
            .overall-item {
              text-align: center;
            }
            .overall-item strong {
              color: #1e40af;
            }
            .co-scholastic {
              margin-bottom: 30px;
            }
            .co-scholastic h3 {
              color: #1e40af;
              margin-bottom: 15px;
            }
            .teacher-remarks {
              background-color: #f9fafb;
              padding: 20px;
              border-radius: 8px;
              margin-bottom: 30px;
            }
            .teacher-remarks h4 {
              color: #1e40af;
              margin-top: 0;
            }
            .signatures {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 40px;
              margin-top: 50px;
            }
            .signature {
              text-align: center;
            }
            .signature-line {
              width: 80%;
              margin: 50px auto 10px;
              border-top: 1px solid #000;
            }
            @media print {
              body { margin: 0; padding: 0; }
              .container { padding: 10px; }
              .no-print { display: none; }
              .page-break { page-break-after: always; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="${school?.logo_url || ''}" alt="School Logo" class="logo">
              <div class="school-info">
                <h1>${school?.name || 'School Name'}</h1>
                <h2>CBSE ${report.term} Report Card</h2>
                <p>Academic Year: ${report.academic_year}</p>
              </div>
            </div>
            
            <div class="student-info">
              <div class="info-item">
                <span class="info-label">Student Name:</span>
                <span>${student.full_name}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Admission No:</span>
                <span>${student.admission_no || 'N/A'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Class:</span>
                <span>${student.grade || 'N/A'} - ${student.section || 'N/A'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Roll No:</span>
                <span>${student.roll_no || 'N/A'}</span>
              </div>
            </div>
            
            <table class="subjects-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>FA1</th>
                  <th>FA2</th>
                  <th>SA1</th>
                  <th>Mid Term GP</th>
                  <th>Final GP</th>
                  <th>Grade</th>
                </tr>
              </thead>
              <tbody>
                ${reportData?.subjects?.map((subject: any) => `
                  <tr>
                    <td>${subject.name}</td>
                    <td>${subject.fa1_gp?.toFixed(1) || '-'}</td>
                    <td>${subject.fa2_gp?.toFixed(1) || '-'}</td>
                    <td>${subject.sa1_gp?.toFixed(1) || '-'}</td>
                    <td>${subject.mid_term_gp?.toFixed(1) || '-'}</td>
                    <td>${subject.final_gpa?.toFixed(1) || '-'}</td>
                    <td>${subject.final_grade || '-'}</td>
                  </tr>
                `).join('') || '<tr><td colspan="7">No subject data available</td></tr>'}
              </tbody>
            </table>
            
            <div class="overall">
              <div class="overall-item">
                <strong>Overall GPA</strong>
                <p>${gpa.toFixed(1)}</p>
              </div>
              <div class="overall-item">
                <strong>Overall Grade</strong>
                <p>${grade}</p>
              </div>
              <div class="overall-item">
                <strong>Attendance</strong>
                <p>${reportData?.attendance?.percentage || 'N/A'}%</p>
              </div>
            </div>

            ${coScholastic ? `
              <div class="co-scholastic">
                <h3>Co-Scholastic Activities</h3>
                <table class="co-scholastic-table">
                  <tr>
                    <th colspan="2">Activities</th>
                    <th colspan="2">Attitude and Values</th>
                    <th colspan="2">Personal Qualities</th>
                  </tr>
                  <tr>
                    <td>Oral Expression</td>
                    <td>${coScholastic.oral_expression || '-'}</td>
                    <td>Towards Teachers</td>
                    <td>${coScholastic.towards_teachers || '-'}</td>
                    <td>Punctuality</td>
                    <td>${coScholastic.punctuality || '-'}</td>
                  </tr>
                  <tr>
                    <td>Handwriting</td>
                    <td>${coScholastic.handwriting || '-'}</td>
                    <td>Towards Students</td>
                    <td>${coScholastic.towards_students || '-'}</td>
                    <td>Initiative</td>
                    <td>${coScholastic.initiative || '-'}</td>
                  </tr>
                  <tr>
                    <td>General Knowledge</td>
                    <td>${coScholastic.general_knowledge || '-'}</td>
                    <td>Towards School</td>
                    <td>${coScholastic.towards_school || '-'}</td>
                    <td>Confidence</td>
                    <td>${coScholastic.confidence || '-'}</td>
                  </tr>
                  <tr>
                    <td>Activity/Sports</td>
                    <td>${coScholastic.activity_sports || '-'}</td>
                    <td></td>
                    <td></td>
                    <td>Neatness</td>
                    <td>${coScholastic.neatness || '-'}</td>
                  </tr>
                </table>
              </div>
            ` : ''}

            ${coScholastic?.teacher_remarks ? `
              <div class="teacher-remarks">
                <h4>Teacher's Remarks</h4>
                <p>${coScholastic.teacher_remarks}</p>
              </div>
            ` : ''}

            <div class="signatures">
              <div class="signature">
                <div class="signature-line"></div>
                <p>Class Teacher</p>
              </div>
              <div class="signature">
                <div class="signature-line"></div>
                <p>Principal</p>
              </div>
              <div class="signature">
                <div class="signature-line"></div>
                <p>Parent</p>
              </div>
            </div>
          </div>
          
          <div class="no-print">
            <button onclick="window.print()">Print Report</button>
            <button onclick="window.close()">Close</button>
          </div>
        </body>
      </html>
    `;
  };

  // Filter reports based on search query
  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      const searchStr = searchQuery.toLowerCase();
      return (
        report.student?.full_name?.toLowerCase().includes(searchStr) ||
        report.student?.admission_no?.toLowerCase().includes(searchStr) ||
        report.student?.grade?.toLowerCase().includes(searchStr) ||
        report.student?.section?.toLowerCase().includes(searchStr)
      );
    });
  }, [reports, searchQuery]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredReports.length / reportsPerPage);
  const paginatedReports = filteredReports.slice(
    (currentPage - 1) * reportsPerPage,
    currentPage * reportsPerPage
  );

  // Handle bulk download
  const handleBulkDownload = async (selectedReports: CBSEGeneratedReport[]) => {
    try {
      // Create a zip file
      const zip = new window.JSZip();

      // Add each report to the zip
      for (const report of selectedReports) {
        const reportHtml = generateReportHTML(report);
        const pdfBlob = await window.html2pdf().from(reportHtml).outputPdf('blob');
        const fileName = `${report.student?.full_name}_${report.term}_Report.pdf`;
        zip.file(fileName, pdfBlob);
      }

      // Generate and download the zip file
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = zipUrl;
      link.download = `CBSE_Reports_${selectedReports[0].term}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(zipUrl);
    } catch (error) {
      console.error('Error generating bulk download:', error);
      toast.error('Failed to generate bulk download');
    }
  };

  // Generate CBSE reports mutation
  const generateCBSEReportsMutation = useMutation({
    mutationFn: async ({ term, grade, section }: { 
      term: 'Term1' | 'Term2' | 'Cumulative'; 
      grade: string; 
      section: string; 
    }) => {
      if (!user?.school_id) throw new Error('No school ID');

      // Get students in this section
      const { data: sectionData, error: sectionError } = await supabase
        .from('sections')
        .select(`
          id,
          students (
            id,
            full_name,
            admission_no,
            grade,
            section
          )
        `)
        .eq('grade', parseInt(grade))
        .eq('section', section)
        .eq('school_id', user?.school_id)
        .single();

      if (sectionError) {
        console.error('Error fetching section:', sectionError);
        throw new Error('Failed to fetch students');
      }

      const students = sectionData?.students || [];
      if (!students.length) {
        throw new Error('No students found in this section');
      }

      // Debug log
      console.log('Processing students:', students);

      // Process each student
      const results = await Promise.all(
        students.map(async (student) => {
          // Debug log
          console.log('Processing student:', { id: student.id, name: student.full_name });

          // Validate co-scholastic assessment if needed
          const hasCoScholastic = await validateCoScholasticAssessment(
            student.id,
            term,
            school?.academic_year || '2024-25'
          );

          // Debug log
          console.log('Co-scholastic validation result:', { student: student.full_name, hasCoScholastic });

          if (includeCoScholastic && !hasCoScholastic) {
            return {
              student: student.full_name,
              status: 'error',
              message: 'Co-scholastic assessment not found'
            };
          }

          // Get exam groups
          const { data: examGroups = [], error: examGroupsError } = await supabase
            .from('exam_groups')
            .select('*')
            .eq('school_id', user.school_id)
            .eq('is_published', true);

          if (examGroupsError) throw examGroupsError;

          let reportData: CBSEReportData;

          if (term === 'Cumulative') {
            // Handle cumulative report logic
            const term1Marks = await fetchStudentMarksForTerm(
              student.id, 
              getRelevantExamGroups(examGroups as ExamGroup[], 'Term1'),
              'Term1'
            );

            const term2Marks = await fetchStudentMarksForTerm(
              student.id, 
              getRelevantExamGroups(examGroups as ExamGroup[], 'Term2'),
              'Term2'
            );

            // Calculate cumulative GPA
            const allMarks = [...term1Marks, ...term2Marks];
            const overallResult = calculateOverallResult(allMarks);

            // Get co-scholastic data from both terms
            let coScholastic = undefined;
            if (includeCoScholastic) {
              const term1Data = await fetchCoScholasticAssessment(student.id, 'Term1', school?.academic_year || '2024-25');
              const term2Data = await fetchCoScholasticAssessment(student.id, 'Term2', school?.academic_year || '2024-25');
              if (term2Data) { // Use Term2 data for cumulative report
                coScholastic = {
                  oral_expression: term2Data.oral_expression,
                  handwriting: term2Data.handwriting,
                  general_knowledge: term2Data.general_knowledge,
                  activity_sports: term2Data.activity_sports,
                  towards_teachers: term2Data.towards_teachers,
                  towards_students: term2Data.towards_students,
                  towards_school: term2Data.towards_school,
                  punctuality: term2Data.punctuality,
                  initiative: term2Data.initiative,
                  confidence: term2Data.confidence,
                  neatness: term2Data.neatness,
                  teacher_remarks: term2Data.teacher_remarks
                };
              }
            }

            // Generate report data
            reportData = generateCumulativeReportData(
              student,
              allMarks,
              overallResult.gpa, // Term1 GPA
              overallResult.gpa, // Term2 GPA (assuming same for cumulative)
              overallResult.gpa, // Final GPA
              overallResult.grade, // Final Grade
              coScholastic
            );
          } else {
            // For Term1 or Term2 - fetch marks from respective exam groups
            const subjectMarks = await fetchStudentMarksForTerm(
              student.id, 
              getRelevantExamGroups(examGroups as ExamGroup[], term),
              term
            );

            // Calculate overall GPA and grade
            const overallResult = calculateOverallResult(subjectMarks);

            // If includeCoScholastic is true, fetch assessment data
            let coScholastic = undefined;
            if (includeCoScholastic) {
              const coScholasticData = await fetchCoScholasticAssessment(student.id, term, school?.academic_year || '2024-25');
              if (coScholasticData) {
                coScholastic = {
                  oral_expression: coScholasticData.oral_expression,
                  handwriting: coScholasticData.handwriting,
                  general_knowledge: coScholasticData.general_knowledge,
                  activity_sports: coScholasticData.activity_sports,
                  towards_teachers: coScholasticData.towards_teachers,
                  towards_students: coScholasticData.towards_students,
                  towards_school: coScholasticData.towards_school,
                  punctuality: coScholasticData.punctuality,
                  initiative: coScholasticData.initiative,
                  confidence: coScholasticData.confidence,
                  neatness: coScholasticData.neatness,
                  teacher_remarks: coScholasticData.teacher_remarks
                };
              }
            }

            // Generate report data
            reportData = generateReportData(
              student,
              subjectMarks,
              overallResult,
              term as 'Term1' | 'Term2',
              coScholastic
            );
          }

          // Save report to database
          const { data: savedReport, error: saveError } = await supabase
            .from('cbse_generated_reports')
            .upsert({
              school_id: user.school_id,
              student_id: student.id,
              term,
              academic_year: school?.academic_year || '2024-25',
              report_data: reportData,
              generated_by: user.id,
              generated_at: new Date().toISOString(),
              includes_coscholastic: includeCoScholastic,
              status: 'generated',
              published: false
            }, {
              onConflict: 'student_id,term,academic_year'
            })
            .select()
            .single();

          if (saveError) throw saveError;
          return savedReport;
        })
      );

      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cbse-reports'] });
      toast.success('Reports generated successfully!');
      setActiveTab('manage');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to generate reports');
    },
  });

  const getTermColor = (term: string) => {
    switch (term) {
      case 'Term1': return 'bg-blue-100 text-blue-800';
      case 'Term2': return 'bg-green-100 text-green-800';
      case 'Cumulative': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-blue-600" />
            CBSE Report Cards
          </h1>
          <p className="text-gray-600 mt-2">
            Generate Term 1, Term 2, and Cumulative report cards using CBSE grading standards
          </p>
        </div>
        <Badge className="bg-blue-100 text-blue-800 text-lg px-4 py-2">
          {school?.board_type} Board - {school?.grading_scale}
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reports.length}</div>
            <p className="text-xs text-muted-foreground">Generated CBSE reports</p>
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
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{examGroups.length}</div>
            <p className="text-xs text-muted-foreground">CBSE term exams</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{studentsData?.length || 0}</div>
            <p className="text-xs text-muted-foreground">In selected section</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="generate" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Generate CBSE Reports
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
              <CardTitle>Generate New CBSE Report Cards</CardTitle>
              <CardDescription>
                Generate term-wise or cumulative report cards using CBSE grading standards
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Term Selection */}
              <div className="space-y-2">
                <Label htmlFor="term">Select Report Type</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { 
                      value: 'Term1', 
                      label: 'Term 1 Report', 
                      description: 'FA1 + FA2 + SA1',
                      icon: Target 
                    },
                    { 
                      value: 'Term2', 
                      label: 'Term 2 Report', 
                      description: 'FA3 + FA4 + SA2',
                      icon: Target 
                    },
                    { 
                      value: 'Cumulative', 
                      label: 'Cumulative Report', 
                      description: 'Combined Final Report',
                      icon: Award 
                    }
                  ].map((term) => (
                    <Card 
                      key={term.value}
                      className={`cursor-pointer transition-colors ${
                        selectedTerm === term.value ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => setSelectedTerm(term.value as any)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <term.icon className="h-5 w-5 text-blue-600 mt-0.5" />
                          <div>
                            <h4 className="font-medium">{term.label}</h4>
                            <p className="text-sm text-muted-foreground">
                              {term.description}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Co-Scholastic Option */}
              <div className="space-y-2">
                <Label>Co-Scholastic Assessment</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="includeCoScholastic"
                    checked={includeCoScholastic}
                    onCheckedChange={setIncludeCoScholastic}
                  />
                  <label
                    htmlFor="includeCoScholastic"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Include Co-Scholastic Assessment
                  </label>
                </div>
                <p className="text-sm text-muted-foreground">
                  If selected, reports will only be generated for students with completed co-scholastic assessments
                </p>
              </div>

              {/* Grade and Section Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="grade">Select Grade</Label>
                  <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a grade..." />
                    </SelectTrigger>
                    <SelectContent>
                      {grades.map((grade) => (
                        <SelectItem key={grade} value={grade}>
                          Grade {grade}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="section">Select Section</Label>
                  <Select 
                    value={selectedSection} 
                    onValueChange={setSelectedSection}
                    disabled={!selectedGrade}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a section..." />
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

              {/* Students Preview */}
              {selectedGrade && selectedSection && studentsData && (
                <div className="space-y-2">
                  <Label>Students in Grade {selectedGrade} Section {selectedSection}</Label>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="h-5 w-5 text-muted-foreground" />
                          <span className="font-medium">
                            {studentsData.length} students
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {selectedTerm} reports will be generated for all students
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
                    if (selectedTerm && selectedGrade && selectedSection) {
                      generateCBSEReportsMutation.mutate({
                        term: selectedTerm,
                        grade: selectedGrade,
                        section: selectedSection
                      });
                    }
                  }}
                  disabled={!selectedTerm || !selectedGrade || !selectedSection || isGenerating}
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
                      Generate {selectedTerm} Reports
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manage Reports Tab */}
        <TabsContent value="manage" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Manage Generated Reports</CardTitle>
              <CardDescription>
                View, download, and publish generated CBSE report cards
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Search and Filter */}
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search by student name, admission no, grade..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => handleBulkDownload(paginatedReports)}
                  disabled={paginatedReports.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Bulk Download
                </Button>
              </div>

              {/* Reports List */}
              <div className="space-y-4">
                {paginatedReports.map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{report.student?.full_name}</h4>
                          <Badge className={getTermColor(report.term)}>
                            {report.term}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Admission: {report.student?.admission_no} | 
                          Section: {report.student?.section} | 
                          Grade: {report.student?.grade}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Generated: {report.generated_at ? new Date(report.generated_at).toLocaleDateString() : 'Unknown'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => previewReport(report)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadReport(report)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                      {!report.published && (
                        <Button
                          size="sm"
                          onClick={() => publishReport(report.id)}
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Publish
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Report Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Report Card Preview</DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-6">
              {/* Student Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-gray-600">Student Name</p>
                    <p className="font-semibold">{selectedReport.student?.full_name}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-600">Admission No</p>
                    <p className="font-semibold">{selectedReport.student?.admission_no}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-600">Class</p>
                    <p className="font-semibold">{selectedReport.student?.grade} - {selectedReport.student?.section}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-600">Academic Year</p>
                    <p className="font-semibold">{selectedReport.academic_year}</p>
                  </div>
                </div>
              </div>

              {/* Subjects Table */}
              {selectedReport.report_data?.subjects && selectedReport.report_data.subjects.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Subject-wise Performance</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border border-gray-200 rounded-lg">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="border p-3 text-left font-medium">Subject</th>
                          <th className="border p-3 text-center font-medium">FA1</th>
                          <th className="border p-3 text-center font-medium">FA2</th>
                          <th className="border p-3 text-center font-medium">SA1</th>
                          <th className="border p-3 text-center font-medium">Mid Term GP</th>
                          <th className="border p-3 text-center font-medium">Final GP</th>
                          <th className="border p-3 text-center font-medium">Grade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedReport.report_data.subjects.map((subject: any, index: number) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="border p-3 font-medium">{subject.name}</td>
                            <td className="border p-3 text-center">{subject.fa1_gp || '-'}</td>
                            <td className="border p-3 text-center">{subject.fa2_gp || '-'}</td>
                            <td className="border p-3 text-center">{subject.sa1_gp || '-'}</td>
                            <td className="border p-3 text-center">{subject.mid_term_gp || '-'}</td>
                            <td className="border p-3 text-center">{subject.final_gpa || '-'}</td>
                            <td className="border p-3 text-center">
                              <Badge variant="outline">{subject.grade || '-'}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Overall Performance */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-3">Overall Performance</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Overall GPA</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {selectedReport.report_data && 'overall_gpa' in selectedReport.report_data 
                        ? selectedReport.report_data.overall_gpa 
                        : selectedReport.report_data && 'final_gpa' in selectedReport.report_data 
                        ? selectedReport.report_data.final_gpa 
                        : 'N/A'}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Overall Grade</p>
                    <p className="text-2xl font-bold text-green-600">
                      {selectedReport.report_data && 'overall_grade' in selectedReport.report_data 
                        ? selectedReport.report_data.overall_grade 
                        : selectedReport.report_data && 'final_grade' in selectedReport.report_data 
                        ? selectedReport.report_data.final_grade 
                        : 'N/A'}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Attendance</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {selectedReport.report_data?.attendance?.percentage || 'N/A'}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Co-Scholastic Section */}
              {selectedReport.report_data?.coScholastic && (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-3">Co-Scholastic Activities</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border border-gray-200 rounded-lg">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="border p-3 text-left font-medium">Activity/Attribute</th>
                          <th className="border p-3 text-center font-medium">Rating</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Oral Expression</td>
                          <td>{selectedReport.report_data.coScholastic.oral_expression || '-'}</td>
                        </tr>
                        <tr>
                          <td>Handwriting</td>
                          <td>{selectedReport.report_data.coScholastic.handwriting || '-'}</td>
                        </tr>
                        <tr>
                          <td>General Knowledge</td>
                          <td>{selectedReport.report_data.coScholastic.general_knowledge || '-'}</td>
                        </tr>
                        <tr>
                          <td>Activity/Sports</td>
                          <td>{selectedReport.report_data.coScholastic.activity_sports || '-'}</td>
                        </tr>
                        <tr>
                          <td>Towards Teachers</td>
                          <td>{selectedReport.report_data.coScholastic.towards_teachers || '-'}</td>
                        </tr>
                        <tr>
                          <td>Towards Students</td>
                          <td>{selectedReport.report_data.coScholastic.towards_students || '-'}</td>
                        </tr>
                        <tr>
                          <td>Towards School</td>
                          <td>{selectedReport.report_data.coScholastic.towards_school || '-'}</td>
                        </tr>
                        <tr>
                          <td>Punctuality</td>
                          <td>{selectedReport.report_data.coScholastic.punctuality || '-'}</td>
                        </tr>
                        <tr>
                          <td>Initiative</td>
                          <td>{selectedReport.report_data.coScholastic.initiative || '-'}</td>
                        </tr>
                        <tr>
                          <td>Confidence</td>
                          <td>{selectedReport.report_data.coScholastic.confidence || '-'}</td>
                        </tr>
                        <tr>
                          <td>Neatness</td>
                          <td>{selectedReport.report_data.coScholastic.neatness || '-'}</td>
                        </tr>
                        {selectedReport.report_data.coScholastic.teacher_remarks && (
                          <tr>
                            <td>Teacher's Remarks</td>
                            <td>{selectedReport.report_data.coScholastic.teacher_remarks}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => downloadReport(selectedReport)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                {!selectedReport.published && (
                  <Button 
                    onClick={() => {
                      publishReport(selectedReport.id);
                      setShowPreview(false);
                    }}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Publish Report
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 