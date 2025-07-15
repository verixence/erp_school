// CBSE Report Types

// Base interface for subject marks
export interface SubjectMarks {
  name: string;
  fa1_gp?: number;
  fa2_gp?: number;
  sa1_gp?: number;
  mid_term_gp?: number;
  final_gpa: number;
  grade: string;
}

// Student information shared across reports
export interface CBSEStudent {
  id: string;
  full_name: string; // Changed from name to full_name for consistency
  admission_no?: string;
  section?: string;
  grade?: string;
  roll_no?: string;
}

// School information
export interface School {
  id: string;
  name: string;
  board_type?: string;
  grading_scale?: string;
  academic_year?: string;
  logo_url?: string;
}

// Base exam group interface
export interface ExamGroup {
  id: string;
  name: string;
  exam_type: string;
  start_date: string;
  end_date: string;
  is_published: boolean;
}

// Co-scholastic assessment data
export interface CoScholasticAssessment {
  oral_expression: string;
  handwriting: string;
  general_knowledge: string;
  activity_sports: string;
  towards_teachers: string;
  towards_students: string;
  towards_school: string;
  punctuality: string;
  initiative: string;
  confidence: string;
  neatness: string;
  teacher_remarks?: string;
}

// Attendance data
export interface AttendanceData {
  working_days: number;
  present_days: number;
  percentage: number;
}

// Base report data shared by all report types
interface BaseReportData {
  student: CBSEStudent;
  subjects: SubjectMarks[];
  attendance: AttendanceData;
  coScholastic?: CoScholasticAssessment;
}

// Term-specific report data
export interface TermReportData extends BaseReportData {
  term: 'Term1' | 'Term2';
  overall_gpa: number;
  overall_grade: string;
}

// Cumulative report data
export interface CumulativeReportData extends BaseReportData {
  term1_gpa: number;
  term2_gpa: number;
  final_gpa: number;
  final_grade: string;
  promotion_status: 'PROMOTED' | 'DETAINED' | 'COMPARTMENT';
}

// Union type for all report data
export type CBSEReportData = TermReportData | CumulativeReportData;

// Generated report metadata
export interface CBSEGeneratedReport {
  id: string;
  student_id: string;
  term: 'Term1' | 'Term2' | 'Cumulative';
  academic_year: string;
  report_data: CBSEReportData;
  generated_by: string;
  generated_at: string;
  includes_coscholastic: boolean;
  status: 'draft' | 'generated' | 'published' | 'distributed';
  published: boolean;
  published_at?: string;
  student?: CBSEStudent;
}

// Type guard to check if report is cumulative
export function isCumulativeReport(report: CBSEReportData): report is CumulativeReportData {
  return 'final_gpa' in report && 'term1_gpa' in report && 'term2_gpa' in report;
}

// Type guard to check if report is term-specific
export function isTermReport(report: CBSEReportData): report is TermReportData {
  return 'term' in report && 'overall_gpa' in report;
}

// CBSE exam types
export type CBSEExamType = 'FA1' | 'FA2' | 'SA1' | 'FA3' | 'FA4' | 'SA2';

// CBSE exam group
export interface CBSEExamGroup extends ExamGroup {
  description?: string;
  cbse_term: 'Term1' | 'Term2';
  cbse_exam_type: CBSEExamType;
  created_at: string;
}

// Calculated subject interface for internal use
export interface CalculatedSubject {
  name: string;
  fa1_gp?: number;
  fa2_gp?: number;
  sa1_gp?: number;
  mid_term_gp?: number;
  final_gpa: number;
  grade: string;
} 